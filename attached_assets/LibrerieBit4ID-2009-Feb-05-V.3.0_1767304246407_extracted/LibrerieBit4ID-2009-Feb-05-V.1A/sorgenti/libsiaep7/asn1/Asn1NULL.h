
class CAsn1NULL : public CAsn1Type {
private:
	int PutData(unsigned char* pbDest);
public:
	CAsn1NULL();
};
