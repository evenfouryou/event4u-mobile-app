#include "libsiaecard.h"

#include "base64.h"
#include <stdio.h>

CBase64::CBase64() {
	pbSource = NULL;
	unsigned long cbSource = 0;
	TYPE typSource = TYPE_EMPTY;
	//
	pbDestination = NULL;
	cbDestination = 0;
	typDestination = TYPE_EMPTY;
	// 
	cmdCurrent = CMD_NONE;
	uLineLength = 64;
}

CBase64::~CBase64() {
	CloseSourceBuffer();
	CloseDestinationBuffer();
}

void CBase64::CloseSourceBuffer() {
	switch(typSource)  {
	case TYPE_SIMPLE_BUFFER:
		delete[] pbSource;pbSource = NULL;
	break;
	case TYPE_PREALLOCATED_BUFFER:
	break;
	}	
	typSource = TYPE_EMPTY;
}

void CBase64::CloseDestinationBuffer() {
	switch(typDestination) {
	case TYPE_SIMPLE_BUFFER:
		delete[] pbDestination;pbDestination = NULL;
	break;
	case TYPE_PREALLOCATED_BUFFER:
	break;
	}
	typDestination = TYPE_EMPTY;
}

void CBase64::SetLineLength(unsigned int uLineLength) {
	this->uLineLength = (uLineLength>76 || uLineLength<0) ? 76 : (uLineLength-(uLineLength&3));
}

unsigned long CBase64::GetSourceLength() {
	return cbSource;
}

unsigned long CBase64::GetDestinationLength() {
	return cbDestination;
}
	
int CBase64::LoadFileToDecode(const char* szFile) {
	CloseSourceBuffer();
	FILE* f = fopen(szFile, "rb");
	if (!f)
		return FALSE;

	fseek(f, 0, SEEK_END);
	cbSource = ftell(f);
	fseek(f, 0, SEEK_SET);
	pbSource = new unsigned char[cbSource];
	fread(pbSource, 1, cbSource, f);
	typSource = TYPE_SIMPLE_BUFFER;
	cmdCurrent = CMD_DECODE;
	cbDestination = DecodedLength();
	fclose(f);
	f = NULL;
	return TRUE;
}

int CBase64::LoadFileToEncode(const char* szFile) {
	CloseSourceBuffer();

	FILE* f = fopen(szFile, "rb");
	if (!f)
		return FALSE;

	fseek(f, 0, SEEK_END);
	cbSource = ftell(f);
	fseek(f, 0, SEEK_SET);
	pbSource = new unsigned char[cbSource];
	fread(pbSource, 1, cbSource, f);
	typSource = TYPE_SIMPLE_BUFFER;
	cmdCurrent = CMD_ENCODE;
	cbDestination = B64EncodedLength();
	fclose(f);
	f = NULL;
	return TRUE;
}

int CBase64::LoadBufferToDecode(unsigned char* pbBuffer, unsigned long cbBuffer, int bCopy) {
	CloseSourceBuffer();
	if(pbBuffer && cbBuffer) {
		cbSource = cbBuffer;
		if(bCopy) {
			pbSource = new unsigned char[cbBuffer];
			memcpy(pbSource, pbBuffer, cbBuffer);
			typSource = TYPE_SIMPLE_BUFFER;
		} 
		else {
			typSource = TYPE_PREALLOCATED_BUFFER;
			pbSource = pbBuffer;
		}
		cmdCurrent = CMD_DECODE;
		cbDestination = DecodedLength();
		return TRUE;
	}
	return FALSE;
}

int CBase64::LoadBufferToEncode(unsigned char* pbBuffer, unsigned long cbBuffer, int bCopy) {
	CloseSourceBuffer();
	if(pbBuffer && cbBuffer) {
		cbSource = cbBuffer;
		if(bCopy) {
			pbSource = new unsigned char[cbBuffer];
			memcpy(pbSource, pbBuffer, cbBuffer);
			typSource = TYPE_SIMPLE_BUFFER;
		} 
		else {
			typSource = TYPE_PREALLOCATED_BUFFER;
			pbSource = pbBuffer;
		}
		cmdCurrent = CMD_ENCODE;
		cbDestination = B64EncodedLength();
		return TRUE;
	}
	return FALSE;
}

int CBase64::ProcessToFile(const char* szFile) {
	CloseDestinationBuffer();
	// Open and map the file
	FILE* f = fopen(szFile, "wb+");
	if (!f)
		return FALSE;
	if (!ProcessToBuffer(NULL, NULL))
		return FALSE;
	fwrite(pbDestination, 1, cbDestination, f);
	fclose(f);
	f=NULL;
	return TRUE;
}

int CBase64::ProcessToBuffer(unsigned char** ppbBuffer, unsigned long* pcbBuffer) {
	CloseDestinationBuffer();
	if(*ppbBuffer==NULL) {
		typDestination = TYPE_SIMPLE_BUFFER;
		pbDestination = new unsigned char[cbDestination];
		*ppbBuffer = pbDestination;
		*pcbBuffer = cbDestination;
	} 
	else {
		if(*pcbBuffer<cbDestination) return FALSE;
		typDestination = TYPE_PREALLOCATED_BUFFER;
		pbDestination = *ppbBuffer;
		*pcbBuffer = cbDestination;
	}
	switch(cmdCurrent) {
		case CMD_ENCODE:
			Encode();
		break;
		case CMD_DECODE:
			Decode();
		break;
	}
	return TRUE;
}

const char* CBase64::charTbl = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const unsigned char CBase64::byteTbl[] = {
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, // 00 - 0F
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0x3E,0xFF,0xFF,0xFF,0x3F,
	0x34,0x35,0x36,0x37,0x38,0x39,0x3A,0x3B,0x3C,0x3D,0xFF,0xFF,0xFF,0x40,0xFF,0xFF,
	0xFF,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0x0C,0x0D,0x0E,
	0x0F,0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0x1A,0x1B,0x1C,0x1D,0x1E,0x1F,0x20,0x21,0x22,0x23,0x24,0x25,0x26,0x27,0x28,
	0x29,0x2A,0x2B,0x2C,0x2D,0x2E,0x2F,0x30,0x31,0x32,0x33,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
	0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF
};
