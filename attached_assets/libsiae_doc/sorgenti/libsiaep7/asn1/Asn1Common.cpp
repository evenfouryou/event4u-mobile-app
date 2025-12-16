
#include "../libsiaecard.h"
#include "asn1common.h"

unsigned char* Asn1Common::PutDW(unsigned char* pbDest, unsigned long dwData) {
	int b = FALSE; 
	if(dwData&0xFF000000) 
		{ *pbDest++ = ((unsigned char)(dwData>>24)&0xFF); b = TRUE; }
	if(dwData&0xFF0000|b) 
		{ *pbDest++ = ((unsigned char)(dwData>>16)&0xFF); b = TRUE; }
	if(dwData&0xFF00|b) 
		{ *pbDest++ = ((unsigned char)(dwData>>8)&0xFF); }
	{ *pbDest++ = ((unsigned char)dwData&0xFF); }
	return pbDest;
}

unsigned long Asn1Common::DWLength(unsigned long dwData) {
	if(dwData&0xFF000000) return 4;
  if(dwData&0xFF0000)  return 3;
	if(dwData&0xFF00) return 2;
	return 1;
}

unsigned char* Asn1Common::PutPackedDW(unsigned char* pbDest, unsigned long dwData) {
	unsigned char bTmp; 
	int b = FALSE;
	bTmp = ((unsigned char)(dwData>>28)&0x7F);if(bTmp) { *pbDest++ = 0x80|bTmp; b = TRUE; }
	bTmp = ((unsigned char)(dwData>>21)&0x7F);if(bTmp|b) { *pbDest++ = 0x80|bTmp; b = TRUE; }
	bTmp = ((unsigned char)(dwData>>14)&0x7F);if(bTmp|b) { *pbDest++ = 0x80|bTmp; b = TRUE; }
	bTmp = ((unsigned char)(dwData>>7)&0x7F);if(bTmp|b) { *pbDest++ = 0x80|bTmp; b = TRUE; }
	bTmp = ((unsigned char)(dwData&0x7F));*pbDest++ = bTmp;
	return pbDest;
}

unsigned long Asn1Common::PackedDWLength(unsigned long dwData) {
	if((dwData>>28)&0x7F) return 5;
	if((dwData>>21)&0x7F) return 4;
	if((dwData>>14)&0x7F) return 3;
	if((dwData>>7)&0x7F) return 2;
	return 1;
}

unsigned char* Asn1Common::PutSignedDW(unsigned char* pbDest, unsigned long dwData) {
	int b = FALSE;
	if(
		((dwData&0xFF000000)&&(dwData&0xFF800000^0xFF800000))||
		(!(dwData&0xFF800000^0x800000)) || b
	) { *pbDest++ = ((unsigned char)(dwData>>24)&0xFF); b = TRUE; }
	if(
		((dwData&0xFF0000)&&(dwData&0xFF8000^0xFF8000))||
		(!(dwData&0xFF8000^0x8000)) || b
	) { *pbDest++ = ((unsigned char)(dwData>>16)&0xFF); b = TRUE; }
	if(
		((dwData&0xFF00)&&(dwData&0xFF80^0xFF80))||
		(!(dwData&0xFF80^0x80)) || b
	) { *pbDest++ = ((unsigned char)(dwData>>8)&0xFF); }
	{ *pbDest++ = ((unsigned char)dwData&0xFF); }
	return pbDest;	
}

unsigned long Asn1Common::SignedDWLength(unsigned long dwData) {
	if(
		((dwData&0xFF000000)&&(dwData&0xFF800000^0xFF800000))||
		(!(dwData&0xFF800000^0x800000))
	) return 4;
	if(
		((dwData&0xFF0000)&&(dwData&0xFF8000^0xFF8000))||
		(!(dwData&0xFF8000^0x8000)) 
	) return 3;
	if(
		((dwData&0xFF00)&&(dwData&0xFF80^0xFF80))||
		(!(dwData&0xFF80^0x80))
	) return 2;
	return 1;
}
