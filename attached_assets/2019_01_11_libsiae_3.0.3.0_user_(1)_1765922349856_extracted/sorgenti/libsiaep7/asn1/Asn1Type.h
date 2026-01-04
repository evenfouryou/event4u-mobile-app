
#define TC_UNIVERSAL				0x00
#define TC_APPLICATION			0x40
#define TC_CONTEXT_SPECIFIC 0x80
#define TC_PRIVATE					0xC0

#define TT_PRIMITIVE				0x00
#define TT_CONSTRUCTED			0x20

#define ASN1_BOOLEAN						1L	
#define ASN1_INTEGER						2L
#define ASN1_BIT_STRING					3L
#define ASN1_OCTET_STRING				4L
#define ASN1_NULL								5L
#define ASN1_OBJECT							6L
#define ASN1_OBJECT_DESCRIPTOR	7L
#define ASN1_EXTERNAL						8L
#define ASN1_REAL								9L
#define ASN1_ENUMERATED					10L
#define ASN1_UTF8STRING					12L
#define ASN1_SEQUENCE						16L
#define ASN1_SET								17L
#define ASN1_NUMERICSTRING			18L
#define ASN1_PRINTABLESTRING		19L
#define ASN1_IA5STRING					22L
#define ASN1_UTCTIME						23L
#define ASN1_GENERALIZEDTIME		24L
#define ASN1_GRAPHICSTRING			25L
#define ASN1_ISO64STRING				26L
#define ASN1_VISIBLESTRING			26L
#define ASN1_GENERALSTRING			27L
#define ASN1_UNIVERSALSTRING		28L
#define ASN1_BMPSTRING					30L

class CAsn1Type {
protected:	
	unsigned char		m_bClass;
	unsigned long   m_dwTag;
	unsigned long		m_dwEncodedDataLength;
	int		m_bConstructed;
	int		m_bImplicit;
	virtual int PutData(unsigned char* pbDest)=0;
	CAsn1Type() { m_bImplicit = FALSE; }

private:
  unsigned char*		PutHeader(unsigned char* pbDest);

public:

	unsigned long		GetEncodedLength();
	void		SetImplicit() { m_bImplicit = TRUE; }
	unsigned char		GetClass() { return m_bClass; }
	unsigned long		GetTag() { return m_dwTag; }
	int    IsConstructed() { return m_bConstructed; }
	int		IsImplicit() { return m_bImplicit; }
	int		GetEncoded(unsigned char* pbDest);
};
