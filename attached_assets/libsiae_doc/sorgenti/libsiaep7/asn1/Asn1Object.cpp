
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"
#include "asn1object.h"

#ifdef WIN32
#	include <malloc.h>
#else
#	include <alloca.h>
#endif

CAsn1Object::CAsn1Object(const char* szOid) {
	unsigned long i;
	this->m_bClass = TC_UNIVERSAL;
	this->m_bConstructed = FALSE;
	this->m_dwTag = ASN1_OBJECT;
	this->m_pbData = NULL;
	this->m_dwEncodedDataLength = 0;
	if(!szOid) return;
	// process szOid
	unsigned long l = (unsigned long)strlen(szOid), n = 1, *oid;
	char* s = (char*) alloca(++l), *p = s;
	strcpy(s, szOid);
	for(UINT i=0;i<l;i++) 
		if(p[i] == '.') { 
			p[i] = 0; n++ ; 
			if(!p[i+1]) return;
		}
	oid = (unsigned long*) alloca(sizeof(unsigned long)*n);
	for(i = 0;i<n;i++) {
		oid[i] = atoi((const char*)p);
		while(*p++);
	}
	if(n>1) oid[1] = oid[0]*40 + oid[1];
	for(i=(n>1)?1:0;i<n;i++) {
		this->m_dwEncodedDataLength +=
			Asn1Common::PackedDWLength(oid[i]);
	}
	unsigned char* pbTmp = new unsigned char[m_dwEncodedDataLength];
	this->m_pbData = pbTmp;
	for(i=(n>1)?1:0;i<n;i++) 
		pbTmp = Asn1Common::PutPackedDW(pbTmp, oid[i]);
}

CAsn1Object::~CAsn1Object() {
	delete[] this->m_pbData;
}

int CAsn1Object::PutData(unsigned char* pbDest) {
	memcpy(pbDest, this->m_pbData, this->m_dwEncodedDataLength);
	return TRUE;
}

