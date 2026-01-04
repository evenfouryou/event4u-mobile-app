
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"
#include "asn1integer.h"


CAsn1Integer::CAsn1Integer(int iData) : CAsn1Type() {
	this->m_bDelete = FALSE;
	this->m_bClass = TC_UNIVERSAL;
	this->m_bConstructed = FALSE;
	this->m_dwTag = ASN1_INTEGER;
	this->m_pbData = NULL;
	this->m_dwEncodedDataLength = 0;
	this->m_dwEncodedDataLength =
		Asn1Common::SignedDWLength((unsigned long)iData);
	unsigned char* pbTmp = new unsigned char[m_dwEncodedDataLength];
	this->m_pbData = pbTmp;
	this->m_bDelete = TRUE;
	Asn1Common::PutSignedDW(pbTmp, (unsigned long)iData);
}

CAsn1Integer::CAsn1Integer(const unsigned char* pbData, unsigned long cbData, int bCopy) : CAsn1Type() {
	this->m_bClass = TC_UNIVERSAL;
	this->m_bConstructed = FALSE;
	this->m_dwTag = ASN1_INTEGER;
	this->m_bDelete = bCopy;
	this->m_dwEncodedDataLength = cbData;
	if(bCopy) {
		unsigned char* pbTmp = new unsigned char[m_dwEncodedDataLength];
		memcpy(pbTmp, pbData, cbData);
		this->m_pbData = pbTmp;
	} else this->m_pbData = (unsigned char*)pbData;
}

CAsn1Integer::~CAsn1Integer() {
	if (m_bDelete) delete[] this->m_pbData;
}

int CAsn1Integer::PutData(unsigned char* pbDest) {
	memcpy(pbDest, this->m_pbData, this->m_dwEncodedDataLength);
	return TRUE;
}
