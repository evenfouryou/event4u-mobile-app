
class CAsn1RawData : public CAsn1Type {
private:
	int m_bCopied;
	unsigned char* m_pbData;
	int PutData(unsigned char* pbDest);
public:
	CAsn1RawData(const unsigned char* pbData, unsigned long cbData, int bCopy = TRUE, int bConstructed = FALSE);
	~CAsn1RawData();
	void SetImplicit() {};
};
