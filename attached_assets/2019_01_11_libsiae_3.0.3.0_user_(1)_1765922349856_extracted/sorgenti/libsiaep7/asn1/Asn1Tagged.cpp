
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"
#include "asn1tagged.h"

CAsn1Tagged::CAsn1Tagged(CAsn1Type* pData, unsigned long dwTag) : CAsn1Type() {
	this->m_bClass = TC_CONTEXT_SPECIFIC;
	this->m_dwTag = dwTag;
	this->m_pData = pData;
	this->m_dwEncodedDataLength = pData->GetEncodedLength();
	this->m_bConstructed = 
		(m_pData->IsImplicit()) ? pData->IsConstructed() : TRUE;
}

int CAsn1Tagged::PutData(unsigned char* pbDest) {
	if(m_pData->GetEncoded(pbDest)) 
			pbDest+=m_dwEncodedDataLength;
	else return FALSE;
	return TRUE;
}
