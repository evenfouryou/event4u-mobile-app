/*****************************************************************************
               Funzioni esportate dalla libreria "libSIAEcard"
*****************************************************************************/

#include <memory.h>
#include <string.h>
#include "libsiaecardt.h"
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
  x=SendAPDUML(hCards[nSlot],APDU_SELECT,2,0,pSend,0,&SW);
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
  int rv=C_GENERIC_ERROR;
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
  while (dimDati>=EXCHANGE_BUFFER) {
    rv=SendAPDUML(hCards[nSlot],APDU_READBINARY|Offset1,0,&blockLen,0,tmpBuffer,&SW);
    if (rv!=C_OK) return rv;
    if ((SW!=SW_OK)&&(SW!=SW_WRONG_LENGTH)) return SW;
    memcpy(Buffer+letti,tmpBuffer,blockLen);
    if (blockLen!=EXCHANGE_BUFFER) {
      *Len=letti;
      return C_WRONG_LENGTH;
    }
    dimDati-=EXCHANGE_BUFFER;
    letti+=blockLen;
    Offset1 = (WORD)(Offset1 + blockLen);
  }
  if (dimDati>0) {
    rv=SendAPDUML(hCards[nSlot],APDU_READBINARY|Offset1,0,(BYTE*)&dimDati,0,tmpBuffer,&SW);
    if (rv!=C_OK) return rv;
    if ((SW!=SW_OK)&&(SW!=SW_WRONG_LENGTH)) return SW;
    memcpy(Buffer+letti,tmpBuffer,dimDati);
    letti+=dimDati;
  }
  if ((rv!=C_OK)&&(rv!=SW_WRONG_LENGTH)) return SW;
  *Len=letti;
  return C_OK;
}

int CALLINGCONV ReadBinary(WORD Offset, BYTE *Buffer, int *Len)
{
  return ReadBinaryML(Offset,Buffer,Len,defSlot);
}

int CALLINGCONV GetSNML(BYTE serial[8], int nSlot)
{
  int l=26;
  BYTE ef_gdo[26];
  if (!IsInitialized())     return C_NOT_INITIALIZED;
  if (SelectML(0x3f00,nSlot)!=C_OK) return C_FILE_NOT_FOUND;
  if (SelectML(0x2f02,nSlot)!=C_OK) return C_FILE_NOT_FOUND;
  if (ReadBinaryML(0,ef_gdo,&l,nSlot)!=C_OK) return C_GENERIC_ERROR;
  memcpy(serial,&ef_gdo[18],8);
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
  rv=SendAPDUML(hCards[nSlot],APDU_READRECORD|0x00000004|(WORD)(nRec<<8),0,(BYTE*)Len,NULL,Buffer,&SW);
  return C_OK;
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
  rv=SendAPDUML(hCards[nSlot],APDU_VERIFYPIN|0x00000081,(BYTE)strlen(pin),NULL,(BYTE*)pin,NULL,&SW);
  if (rv!=C_OK) return rv;
  if (SW==SW_AUTH_FAILED)
  {
    rv=SendAPDUML(hCards[nSlot],APDU_VERIFYPIN|0x00000081,0,NULL,NULL,NULL,&SW);
    return SW;
  }
  if (SW!=SW_OK) return SW;
  return C_OK;
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
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  if (nPIN!=1) return C_GENERIC_ERROR;
  memset(sBuff,0x00,16);
  memcpy(sBuff,Oldpin,strlen(Oldpin));
  memcpy(sBuff+8,Newpin,strlen(Newpin));
  rv=SendAPDUML(hCards[nSlot],APDU_CRD|0x00000081,16,0,sBuff,NULL,&SW);
  if (rv!=C_OK) return rv;
  if (SW==SW_AUTH_FAILED)
  {
    /* La seguente APDU viene inviata alla carta per ottenere il numero */
    /* di tentativi di verifica PIN rimanenti                           */
    rv=SendAPDUML(hCards[nSlot],APDU_VERIFYPIN|0x00000081,0,NULL,NULL,NULL,&SW);
    return SW;
  }
  if (SW!=SW_OK) return SW;
  return C_OK;
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
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  if (nPIN!=1) return C_GENERIC_ERROR;
  memset(sBuff,0x00,16);
  memcpy(sBuff,Puk,strlen(Puk));
  memcpy(sBuff+8,Newpin,strlen(Newpin));
  bLen = 0;
  rv=SendAPDUML(hCards[nSlot],APDU_RRC|0x00000081,16,&bLen,sBuff,oBuff,&SW);
  if (rv!=C_OK) return rv;
  if (SW==SW_AUTH_FAILED)
  {
    /* La seguente APDU viene inviata alla carta per ottenere il numero */
    /* di tentativi di verifica PUK rimanenti                           */
    rv=SendAPDUML(hCards[nSlot],APDU_VERIFYPIN|0x00000082,0,NULL,NULL,NULL,&SW);
    return SW;
  }
  if (SW!=SW_OK) return SW;
  return C_OK;
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
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  rv=SelectML(FID_MF,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_SIAE_APP_DOMAIN,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_SIAE_CNT_DOMAIN,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_EF_CNT,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SendAPDUML(hCards[nSlot],APDU_READ_COUNTER,0,&len,NULL,tmp,&SW);
  if (rv!=C_OK) return rv;
  if (SW!=SW_OK) return SW;
  if (len!=4) return C_WRONG_LENGTH;
  *value=(DWORD)(tmp[0]<<24|tmp[1]<<16|tmp[2]<<8|tmp[3]);
  return C_OK;
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
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  rv=SelectML(FID_MF,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_SIAE_APP_DOMAIN,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_SIAE_CNT_DOMAIN,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_EF_BALANCE_CNT,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SendAPDUML(hCards[nSlot],APDU_READ_COUNTER,0,&len,NULL,tmp,&SW);
  if (rv!=C_OK) return rv;
  if (SW!=SW_OK) return SW;
  if (len!=4) return C_WRONG_LENGTH;
  *value=(DWORD)(tmp[0]<<24|tmp[1]<<16|tmp[2]<<8|tmp[3]);
  return C_OK;
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
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  rv=SelectML(FID_MF,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_SIAE_APP_DOMAIN,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_SIAE_CNT_DOMAIN,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_EF_CNT,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  /* Preparazione Challenge */
  memcpy(pSend,(BYTE*)"\x00\x01",2);
  memcpy(pSend+2,SN,8);
  memcpy(pSend+10,Data_Ora,8);
  pSend[18]=(BYTE)((Prezzo&0xff000000)>>24);
  pSend[19]=(BYTE)((Prezzo&0x00ff0000)>>16);
  pSend[20]=(BYTE)((Prezzo&0x0000ff00)>>8);
  pSend[21]=(BYTE) (Prezzo&0x000000ff);
  rv=SendAPDUML(hCards[nSlot],APDU_CMP_SIGILLO,22,&len,pSend,tmp,&SW);
  if (rv!=C_OK) return rv;
  if (SW!=SW_OK) return SW;
  *cnt=(tmp[0]<<24)|(tmp[1]<<16)|(tmp[2]<<8)|tmp[3];
  memcpy(mac,&tmp[4],8);
  return C_OK;
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
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  rv=GetSNML(sn,nSlot);
  if (rv!=C_OK) return rv;
  return ComputeSigilloML(Data_Ora, Prezzo, sn, mac, cnt,nSlot);
}

int CALLINGCONV ComputeSigilloEx(BYTE *Data_Ora,DWORD Prezzo,BYTE *mac,DWORD *cnt)
{
  BYTE sn[8];
  int rv=C_OK;
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  rv=GetSN(sn);
  if (rv!=C_OK) return rv;
  return ComputeSigillo(Data_Ora, Prezzo, sn, mac, cnt);
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
  rv=SendAPDUML(hCards[nSlot],APDU_CMP_SIGILLO,22,&len,pSend,tmp,&SW);
  if (rv!=C_OK) return rv;
  if (SW!=SW_OK) return SW;
  *cnt=(tmp[0]<<24)|(tmp[1]<<16)|(tmp[2]<<8)|tmp[3];
  memcpy(mac,&tmp[4],8);
  return C_OK;
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
  BYTE status;
  int len=1,n=1;
  if (SelectML(0x0000,nSlot)!=C_OK) return 0;
  if (SelectML(0x1111,nSlot)!=C_OK) return 0;
  if (SelectML(0x5f02,nSlot)!=C_OK) return 0;
  while (ReadRecordML(n,&status,&len,nSlot)==C_OK) {
    if (status==1) return (n+128);
    if (len>1) len=1;
    n++;
  }
  return 0;
}

BYTE CALLINGCONV GetKeyID() {
  return GetKeyIDML(defSlot);
}

static int GetCert(WORD fid, BYTE *cert, int* dim, int nSlot)
{
  BYTE dimBuff[2];
  int q=0;
  int dd=0;
  int rv=C_OK;
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
  if (dim==NULL) return C_GENERIC_ERROR;
  k=GetKeyIDML(nSlot);
  k-=128;
  if (k<=0) return C_GENERIC_ERROR; 
  fidcert=((0x1a+k-1)<<8)|2;
  return GetCert(fidcert, cert, dim, nSlot);
}

int CALLINGCONV GetCertificate(BYTE *cert, int* dim)
{
  return GetCertificateML(cert,dim,defSlot);
}

int CALLINGCONV GetCACertificateML(BYTE *cert, int* dim, int nSlot)
{
  int rv=C_OK;
  WORD fidcert=0x4101;
  SelectML(0x3f00,nSlot);
  SelectML(0x0000,nSlot);
  SelectML(0x1111,nSlot);
  return GetCert(fidcert, cert, dim, nSlot);
}

int CALLINGCONV GetCACertificate(BYTE *cert, int* dim)
{
  return GetCACertificateML(cert,dim,defSlot);
}

int CALLINGCONV GetSIAECertificateML(BYTE *cert, int* dim, int nSlot)
{
  int rv=C_OK;
  WORD fidcert=0x4102;
  SelectML(0x3f00,nSlot);
  SelectML(0x0000,nSlot);
  SelectML(0x1111,nSlot);
  return GetCert(fidcert, cert, dim, nSlot);
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
  if (!IsInitialized()) return C_NOT_INITIALIZED;
  if (kx>255) return C_UNKNOWN_OBJECT;
  rv=SelectML(FID_MF,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_SIAE_APP_DOMAIN,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  rv=SelectML(FID_P11_APP_DOMAIN,nSlot);
  if (rv!=C_OK) return C_FILE_NOT_FOUND;
  pSendMSE[0]=0x83; pSendMSE[1]=0x01; pSendMSE[2]=(BYTE)kx;

  rv=SendAPDUML(hCards[nSlot],APDU_MSE_RESTORE,0,NULL,NULL,NULL,&SW);
  rv=SendAPDUML(hCards[nSlot],APDU_MSE,3,NULL,pSendMSE,NULL,&SW);
  if (rv!=C_OK) return rv;
  if (SW!=SW_OK) return SW;
  pSendSGN[0]=0;
  memcpy(pSendSGN+1,toSign,128);
  rv=SendAPDUML(hCards[nSlot],APDU_SIGN,129,&len,pSendSGN,Signed,&SW);
  if (rv!=C_OK) return rv;
  if (SW!=SW_OK) return SW;
  return C_OK;
}

int CALLINGCONV Sign(int kx,BYTE *toSign,BYTE *Signed)
{
  return SignML(kx,toSign,Signed,defSlot);
}
