// smime.cpp
#include "libsiaecard.h"
#include "global.h"
#include "internals.h"
#include "md5.h"
#include "sha1.h"
#include "scardhal.h"

#include "base64.h"
#include "utility.h"
#include "pkcs7.h"
#include "smime.h"

#include <math.h>
#include <time.h>
#include <string>
using namespace std;

#ifdef _WIN32
#	define unlink _unlink
#endif
#define CRLF "\r\n"

#include "asn1/asn1.h"

static const char* ShortDays[] = {
	"Mon", "Thu", "Wed", "Tue", "Fri", "Sat", "Sun"
};

static const char* ShortMonths[] = {
	"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
};

static int StringToQuotedPrintable(const unsigned char* InString, unsigned long dwInStringLen, string & OutString);
static int Mime_Message_New(const char* szFrom,
	const char* szTo, 
	const char* szSubject, 
	const char* szOtherHeaders, 
	const unsigned char* pbBody, 
	unsigned long dwBodySize, 
	const char* szAttachments, 
	const char* szOutputPath, 
	int AttachEncodingType);

/*
	Mime_Message_New(): crea un nuovo messaggio RFC822/MIME (body + eventuali allegati)
	eventualmente exportabile
	szAttachments supporta un formato ad uso interno, non documentato, che permette di specificare
	il nome da assegnare ad ogni singolo attachment, aprescindere dal nome effettivo del file
	il formato è: szAttachments = "[filename|]fileFullPath[;[filename|]fileFullPath]..."

    AttachEncodingType:
	0: text, none, text/plain
	1: text, quoted-printable, text/plain
	2: binary, base64, application/octet-stream

*/
static int Mime_Message_New(
				const char* szFrom,
				const char* szTo,
				const char* szSubject,
				const char* szOtherHeaders,
				const unsigned char* pbBody,
				unsigned long dwBodySize,
				const char* szAttachments,
				const char* szOutputPath,
				int AttachEncodingType)
{
	time_t curTime;
	struct tm * pTmVal;
	string rfc822CurrentDateTime;
	char szrfc822CurrentDateTime[256];
	string strAttachments, strAttachment;
	string strTz;
	int iRv = 0;
	int iLen = 0;
	string strMessageHeader;
	string strBoundary("----=_NextPart_8F84C6CA");
	string strBody;
	string strEncodedBodyContents;
	
	curTime = time(NULL);
	pTmVal = localtime(&curTime);

	srand((unsigned int)curTime);

	strBoundary += (char) (rand()%10)+48;
	strBoundary += (char) (rand()%10)+48;
	if (szAttachments) strAttachments = szAttachments;
	
	strTz = "+0100";
	iLen = sprintf(szrfc822CurrentDateTime, "%s, %d %s %04d %02d:%02d:%02d %s", 
			ShortDays[pTmVal->tm_wday],
			pTmVal->tm_mday,
			ShortMonths[pTmVal->tm_mon],
			pTmVal->tm_year + 1900,
			pTmVal->tm_hour,
			pTmVal->tm_min,
			pTmVal->tm_sec,
			strTz.c_str());
	rfc822CurrentDateTime = szrfc822CurrentDateTime;
	
	if (szFrom)
	{
		strMessageHeader += "From:";
		strMessageHeader += szFrom;
		strMessageHeader += CRLF;
	}

	if (szTo)
	{
		strMessageHeader += "To:";
		strMessageHeader += szTo;
		strMessageHeader += CRLF;
	}

	if (szSubject)
	{
		strMessageHeader += "Subject:";
		strMessageHeader += szSubject;
		strMessageHeader += CRLF;
	}

	strMessageHeader += "Date:" + rfc822CurrentDateTime + CRLF;

	if (szOtherHeaders && strlen(szOtherHeaders))
	{
		strMessageHeader += szOtherHeaders;
		strMessageHeader += CRLF;
	}


	if (pbBody && dwBodySize && !strAttachments.size())
	{
		string strTmp;
		strTmp.assign((char*)pbBody, dwBodySize);
		strBody += strTmp;
		strBody += CRLF;
	}
	else
	{
		if (pbBody && dwBodySize)
			StringToQuotedPrintable(pbBody, dwBodySize, strEncodedBodyContents);

		strMessageHeader += "MIME-Version: 1.0" CRLF;
		strMessageHeader += "Content-Type: multipart/mixed;" CRLF "\tboundary=\"" + strBoundary +"\"" CRLF;

		strBody = "This is a multi-part message in MIME format." CRLF CRLF;

		if (strEncodedBodyContents.size())
		{
			strBody += "--" + strBoundary + CRLF;
			strBody += "Content-Type: text/plain;" CRLF "\tcharset=\"Windows-1252\"" CRLF;
			strBody += "Content-Transfer-Encoding: quoted-printable" CRLF CRLF;
			strBody += strEncodedBodyContents;
			strBody += CRLF;
		}

		if (strAttachments.size())
		{
			if (strAttachments.substr(strAttachments.size()-1, 1) != ";") strAttachments+= ";";
			int iLastSemicolon, i;
			int iAttachmentsLen = (int)strAttachments.size();
			for (iLastSemicolon=0, i=0; i<iAttachmentsLen; i++)
			{
				FILE* fAtt = NULL;
				size_t fSize = 0;
				if (strAttachments[i] == ';')
				{
					CBase64 b64;
					string strAttatchContents;
					string strFileName;
					char* patt = NULL;
					strAttachment = strAttachments.substr(iLastSemicolon, i - iLastSemicolon);
					int iFnameSpecified =  (int)strAttachment.find("|");
					if (iFnameSpecified > 0)
					{
						strFileName = strAttachment.substr(0, iFnameSpecified);
						strAttachment.erase(0, iFnameSpecified+1);
					}
					else
					{		
						/*char szDrive[MAX_PATH], szPath[MAX_PATH], szFilename[MAX_PATH], szExt[MAX_PATH];
						_tsplitpath(strAttachment, szDrive, szPath, szFilename, szExt);*/
						strFileName = strAttachment;
						// strFileName += szExt;
					}
					b64.SetLineLength(76);
					fAtt = fopen(strAttachment.c_str(), "rb");			
					if (fAtt)
					{
						unsigned char* pBuff = NULL;
						fseek(fAtt, 0, SEEK_END);
						fSize = ftell(fAtt);
						fseek(fAtt, 0, SEEK_SET);
						char* pBody = NULL;
						unsigned long dwBodySize;
						string strTmpBody;
						switch(AttachEncodingType)
						{
						case 0:
							strBody += CRLF "--" + strBoundary + CRLF;
							strBody += "Content-Type: text/plain;" CRLF;
							strBody += "Content-Disposition: attachment;" CRLF "\tfilename=\"";
							strBody += strFileName;
							strBody += "\"" CRLF CRLF;
							dwBodySize = (unsigned long) strBody.size();
							pBuff = new unsigned char[fSize];
							fread(&pBuff, 1, fSize, fAtt);
							strBody.append((char*)pBuff, fSize);
							delete [] pBuff;
							pBuff=NULL;
							break;
						case 1:
							strBody += CRLF "--" + strBoundary + CRLF;
							strBody += "Content-Type: text/plain;" CRLF "\tname=\"";
							strBody += strFileName;
							strBody += "\"" CRLF;
							strBody += "Content-Transfer-Encoding: quoted-printable" CRLF;
							strBody += "Content-Disposition: attachment;" CRLF "\tfilename=\"";
							strBody += strFileName;
							strBody += "\"" CRLF CRLF;
							pBuff = new unsigned char[fSize];
							fread(pBuff, 1, fSize, fAtt);
							StringToQuotedPrintable(pBuff, (unsigned long)fSize, strTmpBody);
							delete [] pBuff;
							pBuff=NULL;
							strBody += strTmpBody;
							strTmpBody.erase();
							break;
						default:
							pBuff = new unsigned char[fSize];
							b64.LoadFileToEncode(strAttachment.c_str());
							patt = new char[b64.GetDestinationLength() +1];
							patt[b64.GetDestinationLength()] = 0;
							unsigned long dwLen = b64.GetDestinationLength();
							b64.ProcessToBuffer((unsigned char**)&patt, &dwLen);
							strBody += CRLF "--" + strBoundary + CRLF;
							strBody += "Content-Type: application/octet-stream;" CRLF "\tname=\"";
							strBody += strFileName;
							strBody += "\"" CRLF;
							strBody += "Content-Transfer-Encoding: base64" CRLF;
							strBody += "Content-Disposition: attachment;" CRLF "\tfilename=\"";
							strBody += strFileName;
							strBody += "\"" CRLF CRLF;
							strBody += patt;
							if (patt) delete [] patt;
							break;
						}
						fclose(fAtt);
					}
					

					iLastSemicolon = i+1;
				}


			}
		}

		strBody += CRLF "--" + strBoundary + "--" CRLF;
	}


	strMessageHeader += CRLF; // fine header, riga vuota

	if (szOutputPath)
	{

		FILE* f = fopen(szOutputPath, "wb+");
		if (f)
		{
			fwrite(strMessageHeader.c_str(), 1, strMessageHeader.size(), f);
			fwrite(strBody.c_str(), 1, strBody.size(), f);
			fclose(f);
		}
		else
			iRv = C_GENERIC_ERROR;
	}
	return iRv;
}


/*
	packSmimeEx() presenta un parametro ulteriore rispetto a packSmime()
	che permette di specificare se inizializzare o meno la libreria
	(in caso di FALSE, si suppone un'inizializzazione ensterna delloo slot)
*/

int CALLINGCONV SMIMESignML(const char* pin, unsigned long slot, const char* szOutputFilePath,
	const char* szFrom, const char* szTo, const char* szSubject, const char* szOtherHeaders, const char* szBody, const char* szAttachments,
	unsigned long dwFlags, int bInitialize)
{

	S_TRACE("packSmime(),parametri: \npin=%s, \nslot=%d, \nszOutputFilePath=%s, \nszFrom=%s, \nszTo=%s, \nszSubject=%s, \nszOtherHeaders=%s, \nszBody=\n%s, \nszAttachments=%s,\ndwFlags=0x%08X\n",
		pin?pin:"NULL", slot,szOutputFilePath?szOutputFilePath:"NULL", szFrom?szFrom:"NULL", szTo?szTo:"NULL",
		szSubject?szSubject:"NULL", szOtherHeaders?szOtherHeaders:"NULL", szBody?szBody:"NULL", szAttachments?szAttachments:"NULL", dwFlags);

	string strFrom(szFrom), strTo(szTo);

	string strTempFile1 = tmpnam(NULL);
	string strTempFile2 = tmpnam(NULL);
	string strTempFile3 = tmpnam(NULL);

	string strAdditionalHeaders("MIME-Version: 1.0" CRLF
		"Content-Type: application/x-pkcs7-mime;" CRLF "\tsmime-type=signed-data;" CRLF "\tname=\"smime.p7m\"" CRLF
		"Content-Transfer-Encoding: base64" CRLF
		"Content-Disposition: attachment;" CRLF "\tfilename=\"smime.p7m\"");
	int iRv = 0;

	int bRes = FALSE;

	if (szOtherHeaders && strlen(szOtherHeaders))
	{
		strAdditionalHeaders += CRLF;
		strAdditionalHeaders += szOtherHeaders;
	}
	
	strTempFile2 = szOutputFilePath; // nessuna cifra

	iRv = Mime_Message_New(
				strFrom.c_str(),
				strTo.c_str(),
				szSubject,
				szOtherHeaders,
				(unsigned char*)szBody,
				(unsigned long)strlen(szBody),
				szAttachments,
				strTempFile1.c_str(), 2); // binary attachment
	if (!iRv)
	{
		iRv = PKCS7SignML(pin, slot, strTempFile1.c_str(), (strTempFile1 + ".p7m").c_str(), bInitialize);
		if (iRv) goto CleanUp;


		CBase64 b64;
		b64.LoadFileToEncode((strTempFile1 + ".p7m").c_str() );
		unsigned long dwSignedData = b64.GetDestinationLength();
		unsigned char* pSignedData = new unsigned char[dwSignedData];
		
		b64.ProcessToBuffer(&pSignedData, &dwSignedData);
		iRv = Mime_Message_New(strFrom.c_str(), strTo.c_str(), szSubject, strAdditionalHeaders.c_str(), pSignedData, dwSignedData, NULL, strTempFile2.c_str(), 0);
		if (pSignedData) delete[] pSignedData; pSignedData=NULL;
	}
	

CleanUp:
	unlink(strTempFile1.c_str() );
	unlink((strTempFile1 + ".p7m").c_str() );

	return iRv;

}


static int StringToQuotedPrintable(const unsigned char* InString, unsigned long dwInStringLen, string & OutString)
{
// quoted for safe mail:
// <= 32 &&  >127
//  "'"  (ASCII code 39)
//  "("  (ASCII code 40)
//  ")"  (ASCII code 41)
//  "+"  (ASCII code 43)
//  ","  (ASCII code 44)
//  "-"  (ASCII code 45)
//  "."  (ASCII code 46)
//  "/"  (ASCII code 47)
//  ":"  (ASCII code 58)
//  "="  (ASCII code 61)
//  "?"  (ASCII code 63)

	OutString.erase();
	string strTmp;
	char szTmp[32];
	unsigned long dwLineCounter=0, dwLen = 0, dwCurrentBufferLen = dwInStringLen + (dwInStringLen/2);
	dwCurrentBufferLen += 3*(dwCurrentBufferLen / 70); // tiene conto dei CRLF ogni 70 caratteri
	for (unsigned long i=0; i<dwInStringLen; i++)
	{
		unsigned char c = (unsigned char)InString[i];
		
		if (c==32 && i < (dwInStringLen-1) && dwLineCounter >= 70)
		{
			OutString.append("=20", 3);
			dwLen += 3;
			dwLineCounter += 3;
		}
		else
		if (c < 32 || c > 127 || (c>=39 && c<=41) || (c>=43 && c<=47) || c == 58 || c == 61 || c == 63)
		{
			sprintf(szTmp, "=%02X", 0x000000FF & c);
			OutString.append(szTmp, 3);
			dwLen += 3;
			dwLineCounter+=3;
		}
		else {
			OutString += c;
			++dwLen;
			++dwLineCounter;
		}
		// if (c=='\n') dwLineCounter = 0;
		if (dwLineCounter >= 72)
		{
			OutString += "=\r\n";
			dwLen += 3;
			dwLineCounter=0;
		}
	}
	return 0;
}
