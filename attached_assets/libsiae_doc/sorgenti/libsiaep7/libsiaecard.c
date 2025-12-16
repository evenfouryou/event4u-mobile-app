/*****************************************************************************
               Funzioni esportate dalla libreria "libSIAEcard"
*****************************************************************************/

#include <memory.h>
#include <string.h>
#include "libsiaecardt.h"
#include "libsiaecard.h"
#include "scardhal.h"
#include "internals.h"

extern int defSlot;
extern SCARDHANDLE hCards[MAX_READERS];

int CALLINGCONV SelectML(WORD fid, int nSlot)
{
  WORD SW;
  int x;
  BYTE pSend[2];
  pSend[0]=(BYTE)((fid&0xff00)>>8);
  pSend[1]=(BYTE)(fid&0x00ff);
  BeginTransactionML(nSlot);
  x=SendAPDUML(nSlot,APDU_SELECT,2,0,pSend,0,&SW);
  EndTransactionML(nSlot);
  if (x!=C_OK) return x;
  if (SW!=0x9000) return SW;
  return C_OK;
}

int CALLINGCONV Select(WORD fid)
{
  return SelectML(fid,defSlot);
}

int CALLINGCONV ReadBinaryML(WORD Offset, BYTE *Buffer, int *Len, int nSlot)
{
  int rv=C_OK;
  WORD SW=0;
  WORD Offset1;
  DWORD dimDati;
  DWORD index;
  BYTE blockLen;
  int letti=0;
  BYTE tmpBuffer[256];
  /* Verifica dei parametri */
  if (!IsInitialized())
    return C_NOT_INITIALIZED;
  if (Buffer==NULL)
    return C_GENERIC_ERROR;
  if ((Len==NULL)||(*Len==0))
    return C_GENERIC_ERROR;
  Offset1 = Offset;
  dimDati = *Len;
  index=0;
  blockLen=EXCHANGE_BUFFER;

  /* Il buffer viene letto a blocchi di dimensioni pari a EXCHANGE_BUFFER.  */
  /* Il valore massimo di EXCHANGE_BUFFER secondo le specifiche PC/SC è 249 */
  /* tuttavia non tutti i lettori riescono a lavorare correttamente con     */
  /* buffer di tali dimensioni.                                             */
  BeginTransactionML(nSlot);
  while (dimDati>=EXCHANGE_BUFFER) {
    rv=SendAPDUML(nSlot,APDU_READBINARY|Offset1,0,&blockLen,0,tmpBuffer,&SW);
    if (rv!=C_OK) { goto CleanUp;}
    if ((SW!=SW_OK)&&(SW!=SW_WRONG_LENGTH)) { rv = SW; goto CleanUp;}
    memcpy(Buffer+letti,tmpBuffer,blockLen);
    if (blockLen!=EXCHANGE_BUFFER) {
      *Len=letti;
      rv = C_WRONG_LENGTH;
	  goto CleanUp;
    }
    dimDati-=EXCHANGE_BUFFER;
    letti+=blockLen;
    Offset1 = (WORD)(Offset1 + blockLen);
  }
  if (dimDati>0) {
    rv=SendAPDUML(nSlot,APDU_READBINARY|Offset1,0,(BYTE*)&dimDati,0,tmpBuffer,&SW);
    if (rv!=C_OK) { goto CleanUp;}
    if ((SW!=SW_OK)&&(SW!=SW_WRONG_LENGTH)) { rv = SW; goto CleanUp;}
    memcpy(Buffer+letti,tmpBuffer,dimDati);
    letti+=dimDati;
  }
  if ((rv!=C_OK)&&(rv!=SW_WRONG_LENGTH)) { rv = SW; goto CleanUp;}
  *Len=letti;
CleanUp:
  EndTransactionML(nSlot);
  return rv;
}

int CALLINGCONV ReadBinary(WORD Offset, BYTE *Buffer, int *Len)
{
  return ReadBinaryML(Offset,Buffer,Len,defSlot);
}

int CALLINGCONV GetSNML(BYTE serial[8], int nSlot)
{
  int rv;
  int l=26;
  BYTE ef_gdo[26];
  if (!IsInitialized())     return C_NOT_INITIALIZED;

  BeginTransactionML(nSlot);
  if (SelectML(0x3f00,nSlot)!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  if (SelectML(0x2f02,nSlot)!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  if (ReadBinaryML(0,ef_gdo,&l,nSlot)!=C_OK) {rv= C_GENERIC_ERROR; goto CleanUp;}
  memcpy(serial,&ef_gdo[18],8);
CleanUp:
  EndTransactionML(nSlot);
  return C_OK;
}

int CALLINGCONV GetSN(BYTE serial[8])
{
  return GetSNML(serial,defSlot);
}

int CALLINGCONV ReadRecordML( int nRec, BYTE* Buffer, int *Len, int nSlot)
{
  WORD SW=0;
  int rv=C_OK;
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  if ((Buffer==NULL)&&(Len==NULL)) return C_GENERIC_ERROR;
  if ((Len==NULL)||(*Len>255)) return C_WRONG_LENGTH;
  if (nRec>255) return C_RECORD_NOT_FOUND;

  BeginTransactionML(nSlot);
  rv=SendAPDUML(nSlot,APDU_READRECORD|0x00000004|(WORD)(nRec<<8),0,(BYTE*)Len,NULL,Buffer,&SW);
  if (rv!=C_OK) {goto CleanUp;}
  if (SW!=SW_OK) {rv = SW; goto CleanUp;}
CleanUp:
  EndTransactionML(nSlot);
  return rv;
}

int CALLINGCONV ReadRecord( int nRec, BYTE* Buffer, int *Len)
{
  return ReadRecordML(nRec,Buffer, Len, defSlot);
}

int CALLINGCONV VerifyPINML(int nPIN, char *pin, int nSlot)
{
  int rv=C_OK;
  WORD SW=0;
  S_TRACE("VerifyPINML: %d, %s, %d\n", nPIN, pin, nSlot);

  if (!IsInitialized()) return C_NOT_INITIALIZED;
  if (nPIN!=1) {
	  S_TRACE("VerifyPINML: invalid pin ID \n");
	  return C_GENERIC_ERROR;
  }
  BeginTransactionML(nSlot);
  rv=SendAPDUML(nSlot,APDU_VERIFYPIN|0x00000081,(BYTE)strlen(pin),NULL,(BYTE*)pin,NULL,&SW);
  if (rv!=C_OK) {goto CleanUp;}

  if (SW==0x6700)
  {
	  char nPin[8];
	  memset(nPin, 0, sizeof(nPin));
	  memcpy(nPin, pin, min(strlen(pin), 8) );
	  rv=SendAPDUML(nSlot,APDU_VERIFYPIN|0x00000081,(BYTE)8,NULL,(BYTE*)nPin,NULL,&SW);
	  if (rv!=C_OK) {goto CleanUp;}
  }

  if (SW==SW_AUTH_FAILED)
  {
    rv=SendAPDUML(nSlot,APDU_VERIFYPIN|0x00000081,0,NULL,NULL,NULL,&SW);
	if (rv!=C_OK) {goto CleanUp;}
    rv = SW; goto CleanUp;
  }
  if (SW!=SW_OK) {rv = SW; goto CleanUp;}
CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("VerifyPINML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV VerifyPIN(int nPIN, char *pin)
{
  return VerifyPINML(nPIN,pin,defSlot);
}

int CALLINGCONV ChangePINML(int nPIN, char *Oldpin, char *Newpin, int nSlot)
{
  int rv=C_OK;
  WORD SW=0;
  BYTE sBuff[256];
  
  S_TRACE("ChangePINML: %d, %s, %s, %d\n", nPIN, Oldpin, Newpin, nSlot);

  if (!IsInitialized()) return C_NOT_INITIALIZED;
  if (nPIN!=1) return C_GENERIC_ERROR;
  memset(sBuff,0x00,16);
  memcpy(sBuff,Oldpin,strlen(Oldpin));
  memcpy(sBuff+8,Newpin,strlen(Newpin));
  
  BeginTransactionML(nSlot);

  rv=SendAPDUML(nSlot,APDU_CRD|0x00000081,16,0,sBuff,NULL,&SW);
  if (rv!=C_OK) goto CleanUp;
  if (SW==SW_AUTH_FAILED)
  {
    /* La seguente APDU viene inviata alla carta per ottenere il numero */
    /* di tentativi di verifica PIN rimanenti                           */
    rv=SendAPDUML(nSlot,APDU_VERIFYPIN|0x00000081,0,NULL,NULL,NULL,&SW);
	if (rv!=C_OK) goto CleanUp;
    rv = SW; goto CleanUp;
  }
  if (SW!=SW_OK)
	{rv= SW; goto CleanUp;}

CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("ChangePINML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV ChangePIN(int nPIN, char *Oldpin, char *Newpin)
{
  return ChangePINML(nPIN,Oldpin,Newpin,defSlot);
}

int CALLINGCONV UnblockPINML(int nPIN, char *Puk, char *Newpin, int nSlot)
{
  int rv=C_OK;
  WORD SW=0;
  BYTE sBuff[256], oBuff[128]; BYTE bLen;
  S_TRACE("UnblockPINML: %d, %s, %s, %d\n", nPIN, Puk, Newpin, nSlot);

  if (!IsInitialized()) return C_NOT_INITIALIZED;
  if (nPIN!=1) return C_GENERIC_ERROR;
  memset(sBuff,0x00,16);
  memcpy(sBuff,Puk,strlen(Puk));
  memcpy(sBuff+8,Newpin,strlen(Newpin));
  bLen = 0;

  BeginTransactionML(nSlot);
  rv=SendAPDUML(nSlot,APDU_RRC|0x00000081,16,&bLen,sBuff,oBuff,&SW);
  if (rv!=C_OK) goto CleanUp;
  if (SW==SW_AUTH_FAILED)
  {
    /* La seguente APDU viene inviata alla carta per ottenere il numero */
    /* di tentativi di verifica PUK rimanenti                           */
    rv=SendAPDUML(nSlot,APDU_VERIFYPIN|0x00000082,0,NULL,NULL,NULL,&SW);
	if (rv!=C_OK) goto CleanUp;
    {rv= SW; goto CleanUp;}
  }
  if (SW!=SW_OK) {rv= SW; goto CleanUp;}
CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("UnblockPINML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV UnblockPIN(int nPIN, char *Puk, char *Newpin)
{
  return UnblockPINML(nPIN,Puk,Newpin,defSlot);
}

int CALLINGCONV ReadCounterML(DWORD *value,int nSlot)
{
  int rv=C_OK;
  WORD SW=0;
  BYTE tmp[4];
  BYTE len=4;

  S_TRACE("ReadCounterML: %d\n", nSlot);
  if (!IsInitialized()) return C_NOT_INITIALIZED;

  BeginTransactionML(nSlot);

  rv=SelectML(FID_MF,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_SIAE_APP_DOMAIN,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_SIAE_CNT_DOMAIN,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_EF_CNT,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SendAPDUML(nSlot,APDU_READ_COUNTER,0,&len,NULL,tmp,&SW);
  if (rv!=C_OK) goto CleanUp;
  if (SW!=SW_OK) { rv = SW; goto CleanUp;}
  if (len!=4) {rv = C_WRONG_LENGTH; goto CleanUp;};
  *value=(DWORD)(tmp[0]<<24|tmp[1]<<16|tmp[2]<<8|tmp[3]);

CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("ReadCounterML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV ReadCounter(DWORD *value)
{
  return ReadCounterML(value,defSlot);
}

int CALLINGCONV ReadBalanceML(DWORD *value, int nSlot)
{
  int rv=C_OK;
  WORD SW=0;
  BYTE tmp[4];
  BYTE len=4;

  S_TRACE("ReadBalanceML: %d\n", nSlot);

  if (!IsInitialized()) return C_NOT_INITIALIZED;

  BeginTransactionML(nSlot);

  rv=SelectML(FID_MF,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_SIAE_APP_DOMAIN,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_SIAE_CNT_DOMAIN,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_EF_BALANCE_CNT,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SendAPDUML(nSlot,APDU_READ_COUNTER,0,&len,NULL,tmp,&SW);
  if (rv!=C_OK) goto CleanUp;
  if (SW!=SW_OK) { rv = SW; goto CleanUp;}
  if (len!=4) {rv = C_WRONG_LENGTH; goto CleanUp;};
  *value=(DWORD)(tmp[0]<<24|tmp[1]<<16|tmp[2]<<8|tmp[3]);

CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("ReadBalanceML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV ReadBalance(DWORD *value)
{
  return ReadBalanceML(value, defSlot);
}

int CALLINGCONV ComputeSigilloML(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,
                            BYTE *mac,DWORD *cnt, int nSlot)
{
  int rv=C_OK;
  WORD SW=0;
  BYTE tmp[12];
  BYTE len=12;
  BYTE pSend[22];
  
  S_TRACE("ComputeSigilloML: %d\n", nSlot);

  if (!IsInitialized()) return C_NOT_INITIALIZED;

  BeginTransactionML(nSlot);
  rv=SelectML(FID_MF,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_SIAE_APP_DOMAIN,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_SIAE_CNT_DOMAIN,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_EF_CNT,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  /* Preparazione Challenge */
  memcpy(pSend,(BYTE*)"\x00\x01",2);
  memcpy(pSend+2,SN,8);
  memcpy(pSend+10,Data_Ora,8);
  pSend[18]=(BYTE)((Prezzo&0xff000000)>>24);
  pSend[19]=(BYTE)((Prezzo&0x00ff0000)>>16);
  pSend[20]=(BYTE)((Prezzo&0x0000ff00)>>8);
  pSend[21]=(BYTE) (Prezzo&0x000000ff);
  rv=SendAPDUML(nSlot,APDU_CMP_SIGILLO,22,&len,pSend,tmp,&SW);
  if (rv!=C_OK) goto CleanUp;
  if (SW!=SW_OK) { rv = SW; goto CleanUp;}
  *cnt=(tmp[0]<<24)|(tmp[1]<<16)|(tmp[2]<<8)|tmp[3];
  memcpy(mac,&tmp[4],8);

CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("ComputeSigilloML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV ComputeSigillo(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,
                            BYTE *mac,DWORD *cnt)
{
  return ComputeSigilloML(Data_Ora,Prezzo,SN,mac,cnt,defSlot);
}

int CALLINGCONV ComputeSigilloExML(BYTE *Data_Ora,DWORD Prezzo,BYTE *mac,DWORD *cnt,int nSlot)
{
  BYTE sn[8];
  int rv=C_OK;

  S_TRACE("ComputeSigilloExML: %d\n", nSlot);

  if (!IsInitialized()) return C_NOT_INITIALIZED;

  BeginTransactionML(nSlot);

  rv=GetSNML(sn,nSlot);
  if (rv!=C_OK) goto CleanUp;
  rv = ComputeSigilloML(Data_Ora, Prezzo, sn, mac, cnt,nSlot);
CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("ComputeSigilloExML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV ComputeSigilloEx(BYTE *Data_Ora,DWORD Prezzo,BYTE *mac,DWORD *cnt)
{
  return ComputeSigilloExML(Data_Ora,Prezzo,mac,cnt, defSlot);
}

int CALLINGCONV ComputeSigilloFastML(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt,int nSlot)
{
  int rv=C_OK;
  WORD SW=0;
  BYTE tmp[12];
  BYTE len=12;
  BYTE pSend[22];
  /* Preparazione Challenge */
  memcpy(pSend,(BYTE*)"\x00\x01",2);
  memcpy(pSend+2,SN,8);
  memcpy(pSend+10,Data_Ora,8);
  pSend[18]=(BYTE)((Prezzo&0xff000000)>>24);
  pSend[19]=(BYTE)((Prezzo&0x00ff0000)>>16);
  pSend[20]=(BYTE)((Prezzo&0x0000ff00)>>8);
  pSend[21]=(BYTE) (Prezzo&0x000000ff);
  
  S_TRACE("ComputeSigilloFastML: %d\n", nSlot);

  BeginTransactionML(nSlot);

  rv=SendAPDUML(nSlot,APDU_CMP_SIGILLO,22,&len,pSend,tmp,&SW);
  if (rv!=C_OK) goto CleanUp;
  if (SW!=SW_OK) { rv = SW; goto CleanUp;}

  *cnt=(tmp[0]<<24)|(tmp[1]<<16)|(tmp[2]<<8)|tmp[3];
  memcpy(mac,&tmp[4],8);
CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("ComputeSigilloFastML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV ComputeSigilloFast(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt)
{
  return ComputeSigilloFastML(Data_Ora,Prezzo,SN,mac,cnt,defSlot);
}


int CALLINGCONV Padding(BYTE *toPad, int Len, BYTE *Padded)
{
  BYTE *p;
  int i=0;
  p=Padded;
  *(p++)=0; *(p++)=1;
  for (i=0; i<128-Len-3; i++)
    *(p++)=255;
  *(p++)=0;
  memcpy(p,toPad,Len);
  return C_OK;
}

BYTE CALLINGCONV GetKeyIDML(int nSlot) {
  BYTE status, brv = 0;
  int len=1,n=1;

  S_TRACE("GetKeyIDML: %d\n", nSlot);

  BeginTransactionML(nSlot);
  if (SelectML(0x0000,nSlot)!=C_OK) {brv = 0; goto CleanUp;}
  if (SelectML(0x1111,nSlot)!=C_OK) {brv = 0; goto CleanUp;}
  if (SelectML(0x5f02,nSlot)!=C_OK) {brv = 0; goto CleanUp;}
  while (ReadRecordML(n,&status,&len,nSlot)==C_OK) {
	if (status==1) { brv = (n+128); goto CleanUp;}
    if (len>1) len=1;
    n++;
  }
CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("GetKeyIDML: %d, rv=0x%08X\n", nSlot, brv);
  return brv;
}

BYTE CALLINGCONV GetKeyID() {
  return GetKeyIDML(defSlot);
}

static int GetCert(WORD fid, BYTE *cert, int* dim, int nSlot)
{
	// funzione interna: nessuna trasnaction
  BYTE dimBuff[2];
  int q=0;
  int dd=0;
  int rv=C_OK;

  S_TRACE("GetCert: %d\n", nSlot);

  rv=SelectML(fid, nSlot);  
  if (rv!=C_OK) return C_GENERIC_ERROR;
  q=2;
  rv=ReadBinaryML(0,dimBuff,&q,nSlot);
  if ((rv!=C_OK)||(q<2)) return C_GENERIC_ERROR;
  dd=(dimBuff[1]<<8)|dimBuff[0];
  if (*dim<dd) {
    *dim=dd;
    return C_WRONG_LEN;
  }
  *dim=dd;
  if (cert!=NULL) {
    rv=ReadBinaryML(2,cert,dim,nSlot);
    if (rv!=C_OK) return C_GENERIC_ERROR;
  }
  return C_OK;
}

int CALLINGCONV GetCertificateML(BYTE *cert, int* dim, int nSlot)
{
  int rv=C_OK;
  WORD fidcert=0;
  BYTE k=0;

  S_TRACE("GetCertificateML: cert=0x%08X, dim=0x%08X, %d\n", cert, dim, nSlot);
  if (dim==NULL) return C_GENERIC_ERROR;

  BeginTransactionML(nSlot);

  k=GetKeyIDML(nSlot);
  k-=128;
  if (k<=0) {rv = C_GENERIC_ERROR; goto CleanUp;}
  fidcert=((0x1a+k-1)<<8)|2;
  rv = GetCert(fidcert, cert, dim, nSlot);
CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("GetCertificateML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV GetCertificate(BYTE *cert, int* dim)
{
  return GetCertificateML(cert,dim,defSlot);
}

int CALLINGCONV GetCACertificateML(BYTE *cert, int* dim, int nSlot)
{
  int rv=C_OK;
  WORD fidcert=0x4101;

  S_TRACE("GetCACertificateML: %d\n", nSlot);

  BeginTransactionML(nSlot);
  SelectML(0x3f00,nSlot);
  SelectML(0x0000,nSlot);
  SelectML(0x1111,nSlot);
  rv = GetCert(fidcert, cert, dim, nSlot);
  EndTransactionML(nSlot);

  S_TRACE("GetCACertificateML: %d, rv=0x%08X\n", nSlot, rv);

  return rv;
}

int CALLINGCONV GetCACertificate(BYTE *cert, int* dim)
{
  return GetCACertificateML(cert,dim,defSlot);
}

int CALLINGCONV GetSIAECertificateML(BYTE *cert, int* dim, int nSlot)
{
  int rv=C_OK;
  WORD fidcert=0x4102;

  S_TRACE("GetSIAECertificateML: %d\n", nSlot);

  BeginTransactionML(nSlot);
  SelectML(0x3f00,nSlot);
  SelectML(0x0000,nSlot);
  SelectML(0x1111,nSlot);
  rv = GetCert(fidcert, cert, dim, nSlot);
  EndTransactionML(nSlot);
  S_TRACE("GetSIAECertificateML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV GetSIAECertificate(BYTE *cert, int* dim)
{
  return GetSIAECertificateML(cert,dim,defSlot);
}

int CALLINGCONV SignML(int kx,BYTE *toSign,BYTE *Signed,int nSlot)
{
  int rv=C_OK;
  BYTE pSendMSE[3];
  BYTE pSendSGN[255];
  WORD SW=0;
  BYTE len=128;

  S_TRACE("SignML: %d\n", nSlot);

  if (!IsInitialized()) return C_NOT_INITIALIZED;
  if (kx>255) return C_UNKNOWN_OBJECT;

  BeginTransactionML(nSlot);
  rv=SelectML(FID_MF,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_SIAE_APP_DOMAIN,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  rv=SelectML(FID_P11_APP_DOMAIN,nSlot);
  if (rv!=C_OK) {rv= C_FILE_NOT_FOUND; goto CleanUp;}
  pSendMSE[0]=0x83; pSendMSE[1]=0x01; pSendMSE[2]=(BYTE)kx;

  rv=SendAPDUML(nSlot,APDU_MSE_RESTORE,0,NULL,NULL,NULL,&SW);
  rv=SendAPDUML(nSlot,APDU_MSE,3,NULL,pSendMSE,NULL,&SW);
  if (rv!=C_OK) {goto CleanUp;}
  if (SW!=SW_OK) {rv = SW; goto CleanUp;}
  pSendSGN[0]=0;
  memcpy(pSendSGN+1,toSign,128);
  rv=SendAPDUML(nSlot,APDU_SIGN,129,&len,pSendSGN,Signed,&SW);
  if (rv!=C_OK) {goto CleanUp;}
  if (SW!=SW_OK) {rv = SW; goto CleanUp;}
CleanUp:
  EndTransactionML(nSlot);
  S_TRACE("SignML: %d, rv=0x%08X\n", nSlot, rv);
  return rv;
}

int CALLINGCONV Sign(int kx,BYTE *toSign,BYTE *Signed)
{
  return SignML(kx,toSign,Signed,defSlot);
}
