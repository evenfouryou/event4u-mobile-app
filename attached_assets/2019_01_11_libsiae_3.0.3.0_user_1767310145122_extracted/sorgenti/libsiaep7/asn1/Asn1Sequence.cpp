
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"
#include "asn1sequence.h"

CAsn1Sequence::CAsn1Sequence(unsigned long dwSize) : CAsn1Type() {
	this->m_bClass = TC_UNIVERSAL;
	this->m_bConstructed = TRUE;
	this->m_dwTag = ASN1_SEQUENCE;
	this->m_rgData = new CAsn1Type*[dwSize];
	this->m_dwEncodedDataLength = 0;
	this->m_dwSize = dwSize;
	this->m_dwFill = 0;
}

CAsn1Sequence::~CAsn1Sequence() {
	delete[] this->m_rgData;
}

void CAsn1Sequence::Resize(unsigned long dwNewSize) {
	if(dwNewSize > m_dwSize) {
		CAsn1Type** ppTmp = new CAsn1Type*[dwNewSize];
		if(!ppTmp) return;
		memcpy(ppTmp, m_rgData, m_dwFill*sizeof(CAsn1Type*));
		delete[] m_rgData; m_rgData = ppTmp;
	}
	m_dwSize = dwNewSize;
}

void CAsn1Sequence::Add(CAsn1Type* pData) {
	if(m_dwFill == m_dwSize) Resize(m_dwSize + 10);
	m_rgData[m_dwFill++] = pData;
	m_dwEncodedDataLength = 0;
	for(UINT i=0;i<m_dwFill;i++) {
		m_dwEncodedDataLength += m_rgData[i]->GetEncodedLength();
	}
}

int CAsn1Sequence::PutData(unsigned char* pbDest) {
	for(UINT i=0;i<m_dwFill;i++) {
		if(m_rgData[i]->GetEncoded(pbDest)) 
			pbDest+=m_rgData[i]->GetEncodedLength();
		else return FALSE;
	}	
	return TRUE;
}
