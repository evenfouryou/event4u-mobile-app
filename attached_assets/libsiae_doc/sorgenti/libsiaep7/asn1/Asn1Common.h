
class Asn1Common {
public:
	static unsigned char* PutDW(unsigned char* pbDest, unsigned long dwData);
	static unsigned long DWLength(unsigned long dwData);
	static unsigned char* PutPackedDW(unsigned char* pbDest, unsigned long dwData);
	static unsigned long PackedDWLength(unsigned long dwData);
	static unsigned char* PutSignedDW(unsigned char* pbDest, unsigned long dwData);
	static unsigned long SignedDWLength(unsigned long dwData);
};
