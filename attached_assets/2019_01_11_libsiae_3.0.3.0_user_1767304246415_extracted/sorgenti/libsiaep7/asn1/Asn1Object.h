
class CAsn1Object : public CAsn1Type {
private:
	unsigned char* m_pbData;
	int PutData(unsigned char* pbDest);
public:
	CAsn1Object(const char* szOid);
	~CAsn1Object();
};
