
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"

unsigned long CAsn1Type::GetEncodedLength() {
	if(m_bImplicit) return m_dwEncodedDataLength;
	unsigned long res = ((m_dwTag < 31) ? 1:Asn1Common::PackedDWLength(m_dwTag)) + 1 + 
		((m_dwEncodedDataLength&0xFFFFFF80) ? Asn1Common::DWLength(m_dwEncodedDataLength):0) + 
		m_dwEncodedDataLength;
	return res;
}

unsigned char* CAsn1Type::PutHeader(unsigned char* pbDest) {
	unsigned char* pbFirst = pbDest;
	if(m_dwTag&0xFFFFFFE0) *pbDest++= 0x1F;
	pbDest = Asn1Common::PutPackedDW(pbDest, m_dwTag);
	*pbFirst |= m_bClass | 
		((m_bConstructed) ? TT_CONSTRUCTED : TT_PRIMITIVE);
	if(m_dwEncodedDataLength&0xFFFFFF80) *pbDest++ = 0x80 + 
		(unsigned char) Asn1Common::DWLength(m_dwEncodedDataLength);
	pbDest = Asn1Common::PutDW(pbDest, m_dwEncodedDataLength);
	return pbDest;
}

int CAsn1Type::GetEncoded(unsigned char* pbDest) {
	int retval = PutData((m_bImplicit) ? pbDest : PutHeader(pbDest));
	return retval;
}
