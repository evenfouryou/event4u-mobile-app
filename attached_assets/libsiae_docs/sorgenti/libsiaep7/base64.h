typedef void *HANDLE;

class CBase64 {

private:
	// base 64 characters
	static const char* charTbl;
	static const unsigned char byteTbl[];

	typedef enum eCommand {CMD_ENCODE=1, CMD_DECODE=2, CMD_NONE=0} COMMAND;
	typedef enum eType {TYPE_FILEMAPPING=1, TYPE_SIMPLE_BUFFER=2,TYPE_PREALLOCATED_BUFFER = 3, TYPE_EMPTY=0} TYPE;

	// Buffers
	unsigned char* pbSource;
	unsigned long cbSource;
	TYPE typSource;
	//
	unsigned char* pbDestination;
	unsigned long cbDestination;
	TYPE typDestination;
	//
	COMMAND cmdCurrent;
	unsigned int uLineLength;
	//

	unsigned long inline B64EncodedLength() {
		unsigned long dwRet = (cbSource/3) * 4;
		if (cbSource %3) dwRet += 4;
		dwRet+= (((dwRet/uLineLength)+(((dwRet%uLineLength)==0)?1:0)))*2;
		return dwRet;
	}

	unsigned long inline DecodedLength() {
		unsigned char* p = pbSource + cbSource - 1;
		while(byteTbl[*p--]==0xFF) cbSource--;
		unsigned long dwCleanLength = cbSource;
		for(unsigned int i=0;i<cbSource;i++) {
			if(byteTbl[pbSource[i]]==0xFF) dwCleanLength--;
		}
		if(!(dwCleanLength&3)) {
			unsigned int uPaddingChars = 0;
			while(pbSource[cbSource-uPaddingChars-1] == '=')
				uPaddingChars++;
			if(uPaddingChars>2) return (unsigned long)-1;
			return (((dwCleanLength-4)>>2)*3) + ((uPaddingChars==0)? 3 : (uPaddingChars == 2) ? 1 : 2);
		}
		else
			return (unsigned long)-1;
	}

	void inline Encode() {
		unsigned long bModulus = cbSource%3;
		unsigned long dwMainChunk = cbSource/3;
		unsigned char* d = pbDestination, *s = pbSource;
		unsigned char r = 0;
		unsigned int uCyclesPerLineFeed = uLineLength>>2;
		for(unsigned int i=1;i<=dwMainChunk;i++) {
			*d++ = charTbl[(*s&0xFC)>>2];
			r = (unsigned char)*s++&0x3;
			*d++ = charTbl[((*s&0xF0)>>4)|(r<<4)];
			r = (unsigned char)*s++&0xF;
			*d++ = charTbl[((*s&0xC0)>>6)|(r<<2)];
			*d++ = charTbl[*s++&0x3F];
			if(!(i%uCyclesPerLineFeed)) {*d++='\r'; *d++='\n';}
		}
		switch(bModulus) {
			case 1:
				*d++ = charTbl[(*s&0xFC)>>2];
				r = (unsigned char)*s&0x3;
				*d++ = charTbl[r<<4];
				memcpy(d, (unsigned char*)"==",2);
			break;
			case 2:
				*d++ = charTbl[(*s&0xFC)>>2];
				r = (unsigned char)*s++&0x3;
				*d++ = charTbl[((*s&0xF0)>>4)|(r<<4)];
				*d++ = charTbl[(*s++&0xF)<<2];
				*d = '=';
			break;
		}
	}

	void inline Decode() {
		unsigned char* d = pbDestination, *s = pbSource;
		unsigned char pbBuffer[4];unsigned int uBufferIndex = 0;
		unsigned char bCode;
		for(unsigned int i=0;i<cbSource;i++) {
			bCode = byteTbl[*s++];
			if(bCode!=0xFF) {
				pbBuffer[uBufferIndex++] = bCode;
				if(bCode==64) {
					switch(uBufferIndex) {
					case(3):
						*d++=pbBuffer[0]<<2|pbBuffer[1]>>4;
					return;
					case(4):
						*d++=pbBuffer[0]<<2|pbBuffer[1]>>4;
						*d++=pbBuffer[1]<<4|pbBuffer[2]>>2;
					return;
					}
				}
				if(uBufferIndex == 4) {
					*d++=(pbBuffer[0]<<2)|(pbBuffer[1]>>4);
					*d++=(pbBuffer[1]<<4)|(pbBuffer[2]>>2);
					*d++=(pbBuffer[2]<<6)|(pbBuffer[3]);
					uBufferIndex = 0;
				}
			}
		}
	}

public:

	CBase64();
	~CBase64();

	void CloseSourceBuffer();
	void CloseDestinationBuffer();
	void SetLineLength(unsigned int uLineLength);
	unsigned long GetSourceLength();
	unsigned long GetDestinationLength();
	int LoadFileToDecode(const char* szFile);
	int LoadFileToEncode(const char* szFile);
	int LoadBufferToDecode(unsigned char* pbBuffer, unsigned long cbBuffer, int bCopy = FALSE);
	int LoadBufferToEncode(unsigned char* pbBuffer, unsigned long cbBuffer, int bCopy = FALSE);
	int ProcessToFile(const char* szFile);
	int ProcessToBuffer(unsigned char** ppbBuffer, unsigned long* pcbBuffer);

};
