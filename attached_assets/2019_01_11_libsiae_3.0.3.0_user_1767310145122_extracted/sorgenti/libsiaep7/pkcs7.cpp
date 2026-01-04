#include "libsiaecard.h"

#include "global.h"
#include "internals.h"
#include "md5.h"
#include "sha1.h"
#include "scardhal.h"
#include <string.h>
#include <stdio.h>
#include <time.h>

#include <string>
using namespace std;

#include "base64.h"
#include "utility.h"

#include "pkcs7.h"

#define CRLF "\r\n"
#include "asn1/asn1.h"

#include <assert.h>

#ifdef WIN32
#	include <malloc.h>
#else
#	include <alloca.h>
#endif

#include <vector>
typedef struct _DER_ITEM
{
	int tag;
	const unsigned char* value;
	size_t len;
	const unsigned char* fvalue;
	size_t flen;
} _DER_ITEM;

typedef vector<_DER_ITEM> _DER_ITEM_vector;
#define TEST_UNEXP_END(X) if(der+(X) > der_end) return v;

static _DER_ITEM_vector der_parse(const unsigned char *der_begin, size_t der_len) {
	_DER_ITEM_vector v;
	int index = 1;
	const unsigned char *der_end = der_begin + der_len;
	const unsigned char *der = der_begin;
	const unsigned char *fder = NULL;
	size_t flen = 0;
	unsigned int tag, cl, co, tg, b, ln;
	while(der < der_end) {
		_DER_ITEM item;
		
		fder = der;
		flen = 2;
		tag = *der++;
		cl = tag>>6; /* 0=universal, 1=application, 
				      2=context-specific, 3=private */
		co = (tag>>5)&1; /* 0=primitive, 1=constructed */
		tg = tag&31; /* 0..30=low tag number, 31=high tag number */
		if(tg==31) return v;
		TEST_UNEXP_END(1);

		b = *der++;
		if(b==0x80) return v;
		else if(b&0x80) { /* long definite length */
			b &= 0x7f;
			if(b>4) v;
			ln = 0;
			switch(b) {
				case 4: TEST_UNEXP_END(1); ln = *der++; ++flen;
				case 3: TEST_UNEXP_END(1); ln = (ln<<8) | *der++; ++flen;
				case 2: TEST_UNEXP_END(1); ln = (ln<<8) | *der++; ++flen;
				case 1: TEST_UNEXP_END(1); ln = (ln<<8) | *der++; ++flen;
			}
		} else { /* short definite length */
			ln = b;
		}
		TEST_UNEXP_END(ln);
		flen += ln;
		item.tag = tag;
		item.value=der;
		item.len = ln;
		item.fvalue=fder;
		item.flen = flen;

		der += ln;
		v.push_back(item);
	}
	assert(der == der_end);
	return v;
}



static int SignDataML(
		int slot,
		unsigned short wKid,
		const unsigned char* pbCertContext,
		unsigned long cbCertContext,
		const unsigned char* pbToBeSigned, unsigned long cbToBeSigned,		// Data to process
		unsigned char* pbSignedBlob, unsigned long* pcbSignedBlob	// Output data
		);
static void FlipMem(unsigned char* pbBuffer, unsigned long cbBuffer) {
	unsigned char *p = pbBuffer;
	unsigned char *q = pbBuffer + cbBuffer - 1;
	unsigned long dwIndex = (cbBuffer >> 1);
	unsigned char bTmp;
	for(int i = dwIndex;i>0;i--) {
		bTmp = *p ;*p++ = *q;*q-- = bTmp;
	}
}



/*
	PKCS7Sign(): crea un pacchetto PKCS#7 firmato usando la smartcard SIAE
*/
int CALLINGCONV PKCS7SignML(
	const char *pin, // pin smartcard
	unsigned long slot, // slot da utilizzare, zero based
	const char* szInputFileName, // nome del file di input
	const char* szOutputFileName, // nome del file di output
	int bInitialize)
{
	S_TRACE("PKCS7SignML(): entry point\n");

	long lenCer, lenDati;
	unsigned char *dati;

	unsigned char	 *certificato;

	FILE* f;
	unsigned short risultato = 0;
	int		ritorno = 0;
	unsigned char	kid = 0;

	S_TRACE("PKCS7SignML(): opening file\n");
	if( (f = fopen(szInputFileName, "rb")) ==  NULL )
	{
		return(C_GENERIC_ERROR);
	}
	
	fseek(f, 0, SEEK_END);
	lenDati = ftell(f);
	fseek(f, 0, SEEK_SET);
	
	if ( (dati = (unsigned char *)malloc(lenDati+1))==NULL )
	{
		fclose(f);
		return(C_GENERIC_ERROR);
	}

	memset(dati, 0, lenDati);
	if ( fread( dati, 1, lenDati, f)!=lenDati )
	{
		fclose(f);
		free(dati);
		return(C_GENERIC_ERROR);
	}
	fclose(f);

	int iInitRes = C_OK;
	if (bInitialize) 
	{
		S_TRACE("PKCS7SignML(): Initialize(slot)\n");
		iInitRes = Initialize(slot);
		if ( iInitRes != C_OK && iInitRes != C_ALREADY_INITIALIZED)
		{
			free(dati);
			return(iInitRes);
		}
	}

	S_TRACE("PKCS7SignML(): Select(0x0000)\n");
	ritorno=SelectML(0x0000, slot);
	S_TRACE("PKCS7SignML(): Select(0x1111)\n");
	ritorno=SelectML(0x1111, slot);

	S_TRACE("PKCS7SignML(): VerifyPIN()\n");
	ritorno = VerifyPINML(1, (char*) pin, slot); 
	if ( ritorno != C_OK )
	{
		free(dati);
		return(ritorno);
	}

	S_TRACE("PKCS7SignML(): GetKeyID()\n");
	kid = GetKeyIDML(slot);
	if ( kid == 0 )
	{
		free(dati);
		return(C_GENERIC_ERROR);
	}

	S_TRACE("PKCS7SignEx(): GetCertificate()\n");
	lenCer = 0;
	ritorno = GetCertificateML(NULL, (int*)&lenCer, slot);
	if ( ritorno != C_WRONG_LEN && ritorno != C_OK ) // aggiunto:  ritorno != C_WRONG_LEN
	{
		free(dati);
		return(ritorno);
	}
	if ( (certificato = (unsigned char *)malloc(lenCer+1))==NULL )
	{
		free(dati);
		return(C_GENERIC_ERROR);
	}
	ritorno = GetCertificateML(certificato, (int*)&lenCer, slot);
	if ( ritorno != C_OK )
	{
		free(dati);
		free(certificato);
		return(ritorno);
	}


	unsigned long dwSignedBlobLen = lenDati + lenCer + 128 + (1024*8); // stima lunghezza pacchetto p7m: dati + cer + firma + 8Kb di overhead
	unsigned char* pSignedBlob = new unsigned char[dwSignedBlobLen]; 

	if (certificato && pSignedBlob)
	{
		S_TRACE("PKCS7SignML(): SignDataML()\n");
		int bRes = SignDataML(slot, kid, certificato, lenCer, dati, lenDati, pSignedBlob, &dwSignedBlobLen);
		assert(bRes && (dwSignedBlobLen <= (unsigned long)(lenDati + lenCer + 128 + (1024*8))));
		if (!bRes) 
		{
			risultato = C_GENERIC_ERROR;
		}
	}
	else
	{
		risultato = C_GENERIC_ERROR;
	}


	if (risultato == C_OK) 
	{
		S_TRACE("PKCS7SignML(): MemWriteFile()\n");
		risultato = MemWriteFile(szOutputFileName, pSignedBlob, dwSignedBlobLen)? C_OK:C_GENERIC_ERROR;
	
	}

	if (bInitialize && iInitRes == C_OK) 
		ritorno = FinalizeML(slot);

	if (pSignedBlob) delete [] pSignedBlob; pSignedBlob=NULL;

	free(dati);
	free(certificato);

	S_TRACE("PKCS7SignML(): returning %d\n", risultato);
	return(risultato);
}

static int SignDataML(
		int slot,
		unsigned short wKid,
		const unsigned char* pbCertContext,
		unsigned long cbCertContext,
		const unsigned char* pbToBeSigned, unsigned long cbToBeSigned,		// Data to process
		unsigned char* pbSignedBlob, unsigned long* pcbSignedBlob	// Output data
		)
{
	int bRet = FALSE;
	unsigned char Sha1Digest[] = {0x30, 0x21, 0x30, 0x09, 0x06, 0x05, 0x2b, 0x0e, 0x03, 0x02, 0x1a, 0x05, 0x00, 0x04, 0x14, // struttura per OID sha1
						 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
						 0x00, 0x00, 0x00, 0x00};
	unsigned char* Sha1Digest_ptr = Sha1Digest + (sizeof Sha1Digest - 0x14);

	unsigned char RsaEncryption[256];
	if(pbSignedBlob && !SHA1(
		pbToBeSigned, 
		cbToBeSigned,
		Sha1Digest_ptr)) return FALSE;
	CAsn1NULL Null;
	CAsn1Sequence ContentInfo(2);
	CAsn1Object SignedDataOID("1.2.840.113549.1.7.2");
	CAsn1Sequence SignedData(5);
	ContentInfo.Add(&SignedDataOID);

	// Version
	CAsn1Integer Version(1);
	SignedData.Add(&Version);
	
	// Digest Algorithms
	CAsn1Set DigestAlgorithmIdentifiers(2);
	CAsn1Sequence DigestAlgorithmIdentifier(2);
	CAsn1Object Sha1OID("1.3.14.3.2.26");
	DigestAlgorithmIdentifier.Add(&Sha1OID);
	DigestAlgorithmIdentifier.Add(&Null);
	DigestAlgorithmIdentifiers.Add(&DigestAlgorithmIdentifier);
	SignedData.Add(&DigestAlgorithmIdentifiers);
	
	// EncapsulatedContent Info
	CAsn1Sequence EncapsulatedContentInfo(2);
	CAsn1Object Pkcs7DataOID("1.2.840.113549.1.7.1");
	CAsn1OctetString Data(pbToBeSigned, cbToBeSigned, FALSE);
	CAsn1Tagged eContent(&Data, 0);
	EncapsulatedContentInfo.Add(&Pkcs7DataOID);
	EncapsulatedContentInfo.Add(&eContent);
	SignedData.Add(&EncapsulatedContentInfo);
	
	// Certificates
	CAsn1RawData Certificate(
		pbCertContext,
		cbCertContext,
		FALSE);
	CAsn1Set CertificateSet(1);
	CertificateSet.Add(&Certificate);
	CertificateSet.SetImplicit();
	CAsn1Tagged Certificates(&CertificateSet, 0);
	SignedData.Add(&Certificates);
	
	// SignerInfos
	CAsn1Set SignerInfos(1);
	CAsn1Sequence SignerInfo1(6);
	CAsn1Integer SignerInfoVersion(1);
	SignerInfo1.Add(&SignerInfoVersion);
	
#define DER_CLASS_UNIVERSAL (0)
#define DER_CLASS_CONTEXT_SPECIFIC (128)
#define DER_CONSTRUCTED (32)
#define DER_SEQUENCE (DER_CLASS_UNIVERSAL + DER_CONSTRUCTED + 16)
#define DER_INTEGER (DER_CLASS_UNIVERSAL + 2)
#define DER_BIT_STRING (DER_CLASS_UNIVERSAL + 3)
#define DER_CONTEXT (DER_CLASS_CONTEXT_SPECIFIC + DER_CONSTRUCTED)

	const unsigned char* pbIssuer = NULL;
	size_t cbIssuer = NULL;
	const unsigned char* pbSN = NULL;
	size_t cbSN = NULL;

	_DER_ITEM_vector v1 = der_parse(pbCertContext, cbCertContext);
	if (v1.size() < 1 || v1[0].tag != DER_SEQUENCE)
		return FALSE;
	_DER_ITEM_vector v2 = der_parse(v1[0].value, v1[0].len);
		if (v2.size() < 3
			|| v2[0].tag != DER_SEQUENCE
			|| v2[1].tag != DER_SEQUENCE
			|| v2[2].tag != DER_BIT_STRING)
			return FALSE;

		int off = 0;
		_DER_ITEM_vector v3 = der_parse(v2[0].value, v2[0].len);

		// con version number
		if (v3.size() > 6
			&& v3[0].tag == DER_CONTEXT + 0
			&& v3[1].tag == DER_INTEGER
			&& v3[2].tag == DER_SEQUENCE
			&& v3[3].tag == DER_SEQUENCE
			&& v3[4].tag == DER_SEQUENCE
			&& v3[5].tag == DER_SEQUENCE
			&& v3[6].tag == DER_SEQUENCE)
		{
			pbIssuer = v3[3].fvalue;
			cbIssuer = v3[3].flen;
			pbSN = v3[1].value;
			cbSN = v3[1].len;
		}
		// senza version number
		else if (v3.size() > 5
			&& v3[0].tag == DER_INTEGER
			&& v3[1].tag == DER_SEQUENCE
			&& v3[2].tag == DER_SEQUENCE
			&& v3[3].tag == DER_SEQUENCE
			&& v3[4].tag == DER_SEQUENCE
			&& v3[5].tag == DER_SEQUENCE)
		{
			pbIssuer = v3[2].fvalue;
			cbIssuer = v3[2].flen;
			pbSN = v3[0].value;
			cbSN = v3[0].len;
		}
		else
			return FALSE;


	CAsn1Sequence IssuerAndSerialNumber(2);
	CAsn1RawData Issuer(
		pbIssuer,
		(unsigned long)cbIssuer, TRUE);
	
	CAsn1Integer SerialNumber(
			pbSN,
			(unsigned long)cbSN, TRUE);

	IssuerAndSerialNumber.Add(&Issuer);
	IssuerAndSerialNumber.Add(&SerialNumber);
	SignerInfo1.Add(&IssuerAndSerialNumber);

	SignerInfo1.Add(&DigestAlgorithmIdentifier);
	
	// Signed attributes
		CAsn1Set SignedAttributes(4);

		// Content type
		CAsn1Sequence ContentType(2);
		CAsn1Object ContentTypeOID("1.2.840.113549.1.9.3");
		CAsn1Set ContentTypeValue(1);
		ContentTypeValue.Add(&Pkcs7DataOID);
		ContentType.Add(&ContentTypeOID);
		ContentType.Add(&ContentTypeValue);

		// Signing time
		struct tm *pCurTm = NULL;
		time_t curTime = time(NULL);
		pCurTm = gmtime(&curTime);
		CAsn1UTCTime Time(pCurTm->tm_year+1900, pCurTm->tm_mon+1, pCurTm->tm_mday, pCurTm->tm_hour, pCurTm->tm_min, pCurTm->tm_sec);
		CAsn1Sequence SigningTime(2);
		CAsn1Object SigningTimeOID("1.2.840.113549.1.9.5");
		CAsn1Set SigningTimeValue(1);
		SigningTimeValue.Add(&Time);
		SigningTime.Add(&SigningTimeOID);
		SigningTime.Add(&SigningTimeValue);

		// Message digest
		CAsn1Sequence MessageDigest(2);
		CAsn1Object MessageDigestOID("1.2.840.113549.1.9.4");
		CAsn1Set MessageDigestValue(1);
		CAsn1OctetString MessageDigestOctets((unsigned char*) Sha1Digest_ptr, 20);
		MessageDigestValue.Add(&MessageDigestOctets);
		MessageDigest.Add(&MessageDigestOID);
		MessageDigest.Add(&MessageDigestValue);

		// S/mime capabilities
		CAsn1Sequence SmimeCapabilities_attr(2);
		CAsn1Object SmimeCapabilitiesOID("1.2.840.113549.1.9.15");
		CAsn1Set SmimeCapabilitiesValue(1);
		CAsn1Sequence SmimeCapabilities(3);
		CAsn1Sequence SmimeCapabilitiy_Des_ede3_cbc(1);
		CAsn1Object Des_ede3_cbcOID("1.2.840.113549.3.7");
		CAsn1Sequence SmimeCapabilitiy_Des_cbc(1);
		CAsn1Object Des_cbcOID("1.3.14.3.2.7");
		CAsn1Sequence SmimeCapabilitiy_sha1WithRSA(1);
		CAsn1Object sha1WithRSAOID("1.2.840.113549.1.1.5");

		SmimeCapabilitiy_Des_ede3_cbc.Add(&Des_ede3_cbcOID);
		SmimeCapabilitiy_Des_cbc.Add(&Des_cbcOID);
		SmimeCapabilitiy_sha1WithRSA.Add(&sha1WithRSAOID);
		SmimeCapabilities.Add(&SmimeCapabilitiy_Des_ede3_cbc);
		SmimeCapabilities.Add(&SmimeCapabilitiy_Des_cbc);
		SmimeCapabilities.Add(&SmimeCapabilitiy_sha1WithRSA);
		SmimeCapabilitiesValue.Add(&SmimeCapabilities);
		SmimeCapabilities_attr.Add(&SmimeCapabilitiesOID);
		SmimeCapabilities_attr.Add(&SmimeCapabilitiesValue);

	SignedAttributes.Add(&ContentType);
	SignedAttributes.Add(&SigningTime);
	SignedAttributes.Add(&MessageDigest);
	SignedAttributes.Add(&SmimeCapabilities_attr);
	
	// RSA of attributes
	unsigned long cbRsaSize = 0x80;
	if(pbSignedBlob) {
		unsigned char Padded[256] = {0};
		unsigned long cbToBeEncrypted = SignedAttributes.GetEncodedLength();
		unsigned char* pbToBeEncrypted = (unsigned char*) alloca(sizeof(unsigned char)*cbToBeEncrypted);
		if(!SignedAttributes.GetEncoded(pbToBeEncrypted)) return FALSE;

		if(!SHA1(
			pbToBeEncrypted,
			cbToBeEncrypted,
			Sha1Digest_ptr)) return FALSE;

		Padding(Sha1Digest, sizeof Sha1Digest, Padded);

		if (SignML(wKid, Padded, RsaEncryption, slot) != C_OK) return FALSE;
		int x=0;
	}
	//
	SignedAttributes.SetImplicit();
	CAsn1Tagged SignedAttrs(&SignedAttributes, 0);
	SignerInfo1.Add(&SignedAttrs);
	// Signature algorithm
	CAsn1Sequence SignatureAlgorithmIdentifier(2);
	CAsn1Object RSAOID("1.2.840.113549.1.1.1");
	SignatureAlgorithmIdentifier.Add(&RSAOID);
	SignatureAlgorithmIdentifier.Add(&Null);
	SignerInfo1.Add(&SignatureAlgorithmIdentifier);
	
	// Signature value
	CAsn1OctetString SignatureValue((unsigned char*) RsaEncryption, cbRsaSize, FALSE);
	SignerInfo1.Add(&SignatureValue);

	SignerInfos.Add(&SignerInfo1);
	SignedData.Add(&SignerInfos);
	//
	CAsn1Tagged Content(&SignedData, 0);
	ContentInfo.Add(&Content);
	*pcbSignedBlob = ContentInfo.GetEncodedLength();
	if(pbSignedBlob) ContentInfo.GetEncoded(pbSignedBlob);
	return TRUE;
}

