// test.cpp : Defines the entry point for the console application.
//

#include <scardhal.h>
#include <libsiaecard.h>
#include <libsiaep7.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "cDynlib.h"

typedef int (CALLINGCONV_1 *t_isCardIn)(int n);
typedef int (CALLINGCONV_1 *t_Initialize)(int Slot);
typedef int (CALLINGCONV_1 *t_FinalizeML)(int nSlot);
typedef int (CALLINGCONV_1 *t_SelectML)(WORD fid, int nSlot);

typedef int (CALLINGCONV_1 *t_ReadBinaryML)(WORD Offset, BYTE *Buffer, int *Len, int nSlot);
typedef int (CALLINGCONV_1 *t_GetSNML)(BYTE serial[8],int nSlot);
typedef int (CALLINGCONV_1 *t_VerifyPINML)(int nPIN, char *pin, int nSlot);
typedef int (CALLINGCONV_1 *t_Padding)(BYTE *toPad, int Len, BYTE *Padded);
typedef int (CALLINGCONV_1 *t_Hash)(int mec,BYTE *toHash, int Len, BYTE *Hashed);
typedef int (CALLINGCONV_1 *t_SignML)(int kx,BYTE *toSign,BYTE *Signed, int nSlot);
typedef BYTE(CALLINGCONV_1 *t_GetKeyIDML)(int nSlot);
typedef int (CALLINGCONV_1 *t_GetCertificateML)(BYTE *cert, int* dim, int nSlot);


/* Funzioni per la gestione dei contatori */
typedef int (CALLINGCONV_1 *t_ReadCounter)(DWORD *value);
typedef int (CALLINGCONV_1 *t_ReadCounterML)(DWORD *value, int nSlot);
typedef int (CALLINGCONV_1 *t_ReadBalance)(DWORD *value);
typedef int (CALLINGCONV_1 *t_ReadBalanceML)(DWORD *value, int nSlot);
typedef int (CALLINGCONV_1 *t_ComputeSigillo)(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt);
typedef int (CALLINGCONV_1 *t_ComputeSigilloML)(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt,int nSlot);
typedef int (CALLINGCONV_1 *t_ComputeSigilloEx)(BYTE *Data_Ora,DWORD Prezzo,BYTE *mac,DWORD *cnt);
typedef int (CALLINGCONV_1 *t_ComputeSigilloExML)(BYTE *Data_Ora,DWORD Prezzo,BYTE *mac,DWORD *cnt, int nSlot);
typedef int (CALLINGCONV_1 *t_ComputeSigilloFast)(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt);
typedef int (CALLINGCONV_1 *t_ComputeSigilloFastML)(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt, int nSlot);

#define CHECK_RESULT(RES, CLEANUP) if (RES != 0) goto CLEANUP;

int main(int argc, char* argv[])
{
	unsigned char* certificato = NULL;
	const char * pin = "12345678";
	int slot = 0;
	int lenCer = 0;
	unsigned char kid = 0;
	int res = 0;
	FILE* f = NULL;
	DYN_HANDLE hLib = NULL;
	t_PKCS7SignML	     pPKCS7SignML		= NULL;
	t_SMIMESignML		 pSMIMESignML		= NULL;

	t_isCardIn			 pisCardIn			= NULL;
	t_Initialize         pInitialize        = NULL;
	t_FinalizeML         pFinalizeML        = NULL;
	t_SelectML           pSelectML          = NULL;
	t_ReadBinaryML       pReadBinaryML      = NULL;
	t_GetSNML            pGetSNML           = NULL;
	t_VerifyPINML        pVerifyPINML       = NULL;
	t_Padding            pPadding           = NULL;
	t_Hash               pHash              = NULL;
	t_SignML             pSignML            = NULL;
	t_GetKeyIDML         pGetKeyIDML        = NULL;
	t_GetCertificateML   pGetCertificateML  = NULL;

    t_ReadCounter pReadCounter = NULL;
    t_ReadCounterML pReadCounterML = NULL;
    t_ReadBalance pReadBalance = NULL;
    t_ReadBalanceML pReadBalanceML = NULL;
    t_ComputeSigillo pComputeSigillo = NULL;
    t_ComputeSigilloML pComputeSigilloML = NULL;
    t_ComputeSigilloEx pComputeSigilloEx = NULL;
    t_ComputeSigilloExML pComputeSigilloExML = NULL;
    t_ComputeSigilloFast pComputeSigilloFast = NULL;
    t_ComputeSigilloFastML pComputeSigilloFastML = NULL;
    
	unsigned char Sha1Digest[] = {0x30, 0x21, 0x30, 0x09, 0x06, 0x05, 0x2b, 0x0e, 0x03, 0x02, 0x1a, 0x05, 0x00, 0x04, 0x14, // struttura per OID sha1
						 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
						 0x00, 0x00, 0x00, 0x00};
	unsigned char* Sha1Digest_ptr = Sha1Digest + (sizeof Sha1Digest - 0x14);
	
	unsigned char pbToBeSigned[] = "123";
	unsigned long cbToBeSigned = 3;
	unsigned char Padded[256] = {0};
	unsigned char RsaEncryption[256] = {0};
	
	if (argc < 2)
	{
		printf("usage: %s lib_path [slot [pin] ]\n", argv[0]);
		exit(1);
	}


	hLib = dyn_LoadLibrary(argv[1]);
	if (!hLib)
	{
		printf("unable to load '%s'\n", argv[1]);
		
		exit(1);
	}

	if (argc > 2)
	{
		slot = atoi(argv[2]);
	}
	if (argc > 3)
	{
		pin = argv[3];
	}

	pisCardIn = dyn_GetProcAddress(hLib, "isCardIn");
	pInitialize = dyn_GetProcAddress(hLib, "Initialize");
	pFinalizeML = dyn_GetProcAddress(hLib, "FinalizeML");
	pSelectML = dyn_GetProcAddress(hLib, "SelectML");
	pReadBinaryML = dyn_GetProcAddress(hLib, "ReadBinaryML");
	pGetSNML = dyn_GetProcAddress(hLib, "GetSNML");
	pVerifyPINML = dyn_GetProcAddress(hLib, "VerifyPINML");
	pPadding = dyn_GetProcAddress(hLib, "Padding");
	pHash = dyn_GetProcAddress(hLib, "Hash");
	pSignML = dyn_GetProcAddress(hLib, "SignML");
	pGetKeyIDML = dyn_GetProcAddress(hLib, "GetKeyIDML");
	pGetCertificateML = dyn_GetProcAddress(hLib, "GetCertificateML");
	
    pReadCounter = (t_ReadCounter)dyn_GetProcAddress(hLib, "ReadCounter");
    pReadCounterML = (t_ReadCounterML)dyn_GetProcAddress(hLib, "ReadCounterML");
    pReadBalance = (t_ReadBalance)dyn_GetProcAddress(hLib, "ReadBalance");
    pReadBalanceML = (t_ReadBalanceML)dyn_GetProcAddress(hLib, "ReadBalanceML");
    pComputeSigillo = (t_ComputeSigillo)dyn_GetProcAddress(hLib, "ComputeSigillo");
    pComputeSigilloML = (t_ComputeSigilloML)dyn_GetProcAddress(hLib, "ComputeSigilloML");
    pComputeSigilloEx = (t_ComputeSigilloEx)dyn_GetProcAddress(hLib, "ComputeSigilloEx");
    pComputeSigilloExML = (t_ComputeSigilloExML)dyn_GetProcAddress(hLib, "ComputeSigilloExML");
    pComputeSigilloFast = (t_ComputeSigilloFast)dyn_GetProcAddress(hLib, "ComputeSigilloFast");
    pComputeSigilloFastML = (t_ComputeSigilloFastML)dyn_GetProcAddress(hLib, "ComputeSigilloFastML");
    
	// libSIAEdll code sample:
	printf("libSIAE test starting, slot:%d, pin:%s...\n", slot, pin);
	if (pisCardIn(slot))
	{
        int k;
        BYTE Data_Ora[8] = {0};
        DWORD Prezzo = 120;
        BYTE *SN = (BYTE*)"1234567890123456";
        BYTE mac[8] = {0};
        DWORD cnt = 0;

        DWORD dwCounter = 0;
        DWORD dwBalance = 0;
		res=pInitialize(slot);
		printf("Initialize: 0x%08X \n", res);
        CHECK_RESULT(res, CleanUp);

		{

		printf("Sigillo Fiscale tests...\n", res);
		res=pSelectML(0x0000, slot);
		printf("pSelectML 0000: 0x%08X\n", res);
		CHECK_RESULT(res, CleanUp1);
		res=pSelectML(0x1112, slot);
		printf("pSelectML 1112: 0x%08X\n", res);
		CHECK_RESULT(res, CleanUp1);

		res=pVerifyPINML(1, (char*) pin, slot); 
		printf("pVerifyPINML %s: 0x%08X\n", pin, res);
		CHECK_RESULT(res, CleanUp1);

        res = pReadCounterML(&dwCounter, slot);
        printf("pReadCounterML: 0x%08X, 0x%08X\n", res, dwCounter);
		CHECK_RESULT(res, CleanUp1);

        res = pReadBalanceML(&dwBalance, slot);
        printf("pReadBalanceML: 0x%08X, 0x%08X\n", res, dwBalance);
		CHECK_RESULT(res, CleanUp1);
        
        res = pComputeSigilloML(Data_Ora, Prezzo, SN, mac, &cnt, slot);
        printf("pComputeSigilloML: 0x%08X, cnt:0x%08X\n", res, cnt);
		CHECK_RESULT(res, CleanUp1);
		printf("Sigillo fiscale:");
        for (k=0; k<8; k++)
        {
            printf("%02X ", mac[k]);
        }
        printf("\n", mac[k]);
        
        res = pReadCounterML(&dwCounter, slot);
        printf("pReadCounterML: 0x%08X, 0x%08X\n", res, dwCounter);
		CHECK_RESULT(res, CleanUp1);
        res = pReadBalanceML(&dwBalance, slot);
        printf("pReadBalanceML: 0x%08X, 0x%08X\n", res, dwBalance);
		CHECK_RESULT(res, CleanUp1);
		
		CleanUp1:
		;
		}

		{
		printf("PKI tests...\n", res);

		res=pSelectML(0x0000, slot);
		printf("pSelectML 0000: 0x%08X\n", res);
		CHECK_RESULT(res, CleanUp2);

		res=pSelectML(0x1111, slot);
		printf("pSelectML 1111: 0x%08X\n", res);
		CHECK_RESULT(res, CleanUp2);

		res=pVerifyPINML(1, (char*) pin, slot); 
		printf("pVerifyPINML %s: 0x%08X\n", pin, res);
		CHECK_RESULT(res, CleanUp2);

		kid = pGetKeyIDML(slot);
		kid = kid;
		printf("pGetKeyIDML: 0x%08X\n", res);
		lenCer=0;
		res = pGetCertificateML(NULL, &lenCer, slot);
		printf("pGetCertificateML NULL: 0x%08X (expected SW: 0x6a85)\n", res);
		if (C_WRONG_LEN != res && C_OK != res)
			goto CleanUp2;

		certificato = (unsigned char*)malloc(lenCer);
		res = pGetCertificateML(certificato, &lenCer, slot);
		printf("pGetCertificateML: 0x%08X\n", res);
		CHECK_RESULT(res, CleanUp2);

		res = pHash(HASH_SHA1, pbToBeSigned, cbToBeSigned, Sha1Digest_ptr);
		printf("pHash: 0x%08X\n", res);
		CHECK_RESULT(res, CleanUp2);

		res = pPadding(Sha1Digest, sizeof(Sha1Digest), Padded);
		printf("pPadding: 0x%08X\n", res);
		CHECK_RESULT(res, CleanUp2);

		res = pSignML(kid, Padded, RsaEncryption, slot);
		printf("pSignML: 0x%08X\n", res);
		CHECK_RESULT(res, CleanUp2);

		res = pFinalizeML(0);
		printf("pFinalizeML: 0x%08X\n", res);
		CleanUp2:
		;
		}
		CleanUp:
		printf("libSIAE test completed!\n");
	}

	printf("libSIAEp7 test starting...\n");
	// libSIAEp7 (PKCS#7/SMIME) code sample:
	pPKCS7SignML = dyn_GetProcAddress(hLib, "PKCS7SignML");
	pSMIMESignML = dyn_GetProcAddress(hLib, "SMIMESignML");
	printf("pPKCS7SignML: 0x%08X, pSMIMESignML:0x%08X\n", 
			(unsigned int)pPKCS7SignML, (unsigned int)pSMIMESignML);
	if (!pSMIMESignML)
	{
		perror("unable to find function: SMIMESignML");
		exit(1);
	}
	if (!pPKCS7SignML)
	{
		perror("unable to find function: PKCS7SignML");
		exit(1);
	}

	printf("isCardIn: %d\n", pisCardIn(slot));

	f = fopen("test.txt", "w+");
	if (f)
	{
		fprintf(f, "TEST Attachment\n");
		fclose(f);
		f=NULL;
	}
	res = pPKCS7SignML(pin, slot, "./test.txt", "./test.txt.p7m", TRUE);
	printf("PKCS7SignML: %d\n",res);

	res = pSMIMESignML("12345678",
			slot,
			"prova.eml",
			"Mario Rossi <mariorossi@prova.it>",
			"Luca Bianchi",
			"auguri",
			NULL,
			"Tantissimi auguri",
			"test.txt|./test.txt",
			0, TRUE);
	printf("SMIMESign: %d\n",res);

	printf("libSIAEp7 test completed!\n");
	return 0;
}
