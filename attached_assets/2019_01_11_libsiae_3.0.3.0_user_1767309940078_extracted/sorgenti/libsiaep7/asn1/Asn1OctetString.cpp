
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"
#include "asn1octetstring.h"

CAsn1OctetString::CAsn1OctetString(const unsigned char* pbData, unsigned long cbData, int bCopy) : CAsn1Type() {
	this->m_bClass = TC_UNIVERSAL;
	this->m_bConstructed = FALSE;
	this->m_dwTag = ASN1_OCTET_STRING;
	this->m_bCopied = bCopy;
	this->m_dwEncodedDataLength = cbData;
	if(bCopy) {
		unsigned char* pbTmp = new unsigned char[m_dwEncodedDataLength];
		memcpy(pbTmp, pbData, cbData);
		this->m_pbData = pbTmp;
	} else this->m_pbData = (unsigned char*)pbData;
}

CAsn1OctetString::~CAsn1OctetString() {
	if(m_bCopied) delete[] this->m_pbData;
}

int CAsn1OctetString::PutData(unsigned char* pbDest) {
	memcpy(pbDest, this->m_pbData, this->m_dwEncodedDataLength);
	return TRUE;
}
