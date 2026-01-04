
class CAsn1UTCTime : public CAsn1Type {
private:
	char m_chData[13];
	int PutData(unsigned char* pbDest);
public:
	CAsn1UTCTime(unsigned short wYear, unsigned short wMonth, unsigned short wDay, unsigned short wHour, unsigned short wMinute, unsigned short wSecond);
};
