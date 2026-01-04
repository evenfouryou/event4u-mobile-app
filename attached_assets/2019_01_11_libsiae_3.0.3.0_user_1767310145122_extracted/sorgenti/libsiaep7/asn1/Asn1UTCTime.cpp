
#include "../libsiaecard.h"
#include "asn1common.h"
#include "asn1type.h"
#include "asn1utctime.h"

CAsn1UTCTime::CAsn1UTCTime(unsigned short wYear, unsigned short wMonth, unsigned short wDay, unsigned short wHour, unsigned short wMinute, unsigned short wSecond) : CAsn1Type() {
	char* d[100] = { 
		"00","01","02","03","04","05","06","07","08","09",
		"10","11","12","13","14","15","16","17","18","19",
		"20","21","22","23","24","25","26","27","28","29",
		"30","31","32","33","34","35","36","37","38","39",
		"40","41","42","43","44","45","46","47","48","49",
		"50","51","52","53","54","15","56","57","58","59",
		"60","61","62","63","64","65","66","67","68","69",
		"70","71","72","73","74","75","76","77","78","79",
		"80","81","82","83","84","85","86","87","88","89",
		"90","91","92","93","94","95","96","97","98","99"
	};
	this->m_bClass = TC_UNIVERSAL;
	this->m_bConstructed = FALSE;
	this->m_dwTag = ASN1_UTCTIME;
	this->m_dwEncodedDataLength = 13;
	m_chData[12] = 'Z';
	memcpy(this->m_chData, d[wYear%100], 2);
	memcpy(this->m_chData+2, (wMonth%12 == 0)?d[12]:d[wMonth%12], 2);
	memcpy(this->m_chData+4, (wDay%31 == 0)?d[31]:d[wDay%31], 2);
	memcpy(this->m_chData+6, d[wHour%24], 2);
	memcpy(this->m_chData+8, d[wMinute%60], 2);
	memcpy(this->m_chData+10, d[wSecond%60], 2);
}

int CAsn1UTCTime::PutData(unsigned char* pbDest) {
	memcpy(pbDest, this->m_chData, this->m_dwEncodedDataLength);
	return TRUE;
}
