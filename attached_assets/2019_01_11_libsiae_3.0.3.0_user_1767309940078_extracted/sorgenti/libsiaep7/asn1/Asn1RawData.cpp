
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"
#include "asn1rawdata.h"

CAsn1RawData::CAsn1RawData(const unsigned char* pbData, unsigned long cbData, int bCopy, int bConstructed) {
	this->m_bCopied = bCopy;
	this->m_bImplicit = TRUE;
	this->m_bConstructed = bConstructed;
	this->m_dwEncodedDataLength = cbData;
	if(bCopy) {
		unsigned char* pbTmp = new unsigned char[m_dwEncodedDataLength];
		memcpy(pbTmp, pbData, cbData);
		this->m_pbData = pbTmp;
	} else this->m_pbData = (unsigned char*)pbData;
}

CAsn1RawData::~CAsn1RawData() {
	if(m_bCopied) delete[] this->m_pbData;
}

int CAsn1RawData::PutData(unsigned char* pbDest) {
	memcpy(pbDest, this->m_pbData, this->m_dwEncodedDataLength);
	return TRUE;
}

