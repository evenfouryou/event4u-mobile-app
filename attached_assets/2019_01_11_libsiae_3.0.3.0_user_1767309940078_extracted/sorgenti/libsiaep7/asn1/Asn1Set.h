
class CAsn1Set : public CAsn1Type {
private:
	unsigned long m_dwFill;
	unsigned long m_dwSize;
	CAsn1Type** m_rgData;
	int PutData(unsigned char* pbDest);

public:
	CAsn1Set(unsigned long dwSize);
	~CAsn1Set();
	void Resize(unsigned long dwNewSize);
	void Add(CAsn1Type* pData);
};
