
class CAsn1Sequence : public CAsn1Type {
private:
	unsigned long m_dwFill;
	unsigned long m_dwSize;
	CAsn1Type** m_rgData;
	int PutData(unsigned char* pbDest);

public:
	CAsn1Sequence(unsigned long dwSize);
	~CAsn1Sequence();
	void Resize(unsigned long dwNewSize);
	void Add(CAsn1Type* pData);
};
