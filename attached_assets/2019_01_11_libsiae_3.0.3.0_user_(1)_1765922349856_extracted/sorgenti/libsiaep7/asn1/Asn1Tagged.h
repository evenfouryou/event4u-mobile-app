
class CAsn1Tagged : public CAsn1Type {
private:
	CAsn1Type* m_pData;
	int PutData(unsigned char* pbDest);
public:
	CAsn1Tagged(CAsn1Type* pData, unsigned long dwTag);
};
