
class CAsn1OctetString : public CAsn1Type {
private:
	int m_bCopied;
	unsigned char* m_pbData;
	int PutData(unsigned char* pbDest);
public:
	CAsn1OctetString(const unsigned char* pbData, unsigned long cbData, int bCopy = TRUE);
	~CAsn1OctetString();
};
