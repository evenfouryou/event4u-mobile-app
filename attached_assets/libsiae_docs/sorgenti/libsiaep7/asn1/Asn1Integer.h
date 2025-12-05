
class CAsn1Integer : public CAsn1Type {
private:
	int m_bDelete;
	unsigned char* m_pbData;
	int PutData(unsigned char* pbDest);
public:
	CAsn1Integer(int iData);
	CAsn1Integer(const unsigned char* pbData, unsigned long cbData, int bCopy = TRUE);
	~CAsn1Integer();
};
