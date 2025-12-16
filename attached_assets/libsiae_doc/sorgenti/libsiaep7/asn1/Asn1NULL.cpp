
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"
#include "asn1null.h"

CAsn1NULL::CAsn1NULL() : CAsn1Type() {
	this->m_bClass = TC_UNIVERSAL;
	this->m_bConstructed = FALSE;
	this->m_dwTag = ASN1_NULL;
	this->m_dwEncodedDataLength = 0;
}

int CAsn1NULL::PutData(unsigned char* pbDest) {
	static unsigned long count = 0;
	return TRUE;
}
