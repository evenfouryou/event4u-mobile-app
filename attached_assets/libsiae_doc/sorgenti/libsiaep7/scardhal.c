/*****************************************************************************
                          Hardware Abstraction Layer
Le funzioni contenute nel presente file sono system dependent. E' necessario
provvedere a scrivere funzioni equivalenti cambiando ambiente di sviluppo.
*****************************************************************************/
#include "scardhal.h"

#include "internals.h"

#include "global.h"
#include "sha1.h"
#include "md5.h"

#include <stdlib.h>
#include <string.h>

int defSlot=-1; /* Slot di default */

#define ATR_SIAE_CARD \
  "\x3b\xfb\x11\x00\xff\x81\x31\x80\x55\x00" \
  "\x68\x02\x00\x10\x10\x53\x49\x41\x45\x00\x04"
#define ATR_LEN 0x15

/* hContMLt è una variabile globale e rappresenta il contesto PC/SC */
/* della applicazione */
static SCARDCONTEXT hContext=0;

/* hCard è l'handle che individua univocamente il canale PC/SC */
/* aperto con una smart card */
static SCARDHANDLE  hCard=0;

SCARDHANDLE hCards[MAX_READERS];
int hCardsTransactions[MAX_READERS];
/* initialized è una variabile booleana globale che viene utilizzata */
/* per tenere traccia dell'inizializzazione della libreria */
static BOOL initialized=FALSE;

/* Variabili e funzioni ad uso interno */
static LPTSTR pszReaderNames=NULL;
static DWORD cch=0;

static int instances=0;


int CALLINGCONV IsInitialized()
{
  return initialized;
}

void SetInitialized(BOOL bVal) // 28-11-2002, Peppe: serve per forzare ad initialized la libreria dall'esterno
{
	initialized = bVal;
}

static SCARDHANDLE Connect(int nReader) 
{
  /* Connessione con la carta */
  /* nReader è il numero del lettore (zero based) */
  /* la funzione ritorna l'handle della connessione */
  /* in caso di errore il valore di ritorno è 0 */
  LPTSTR readerNames=NULL;
  DWORD cch=0;
  SCARDHANDLE hCard=0;
  long rv=0;
  DWORD dwAP=0;
  S_TRACE("Connect(): %d\n", nReader);

  if (hContext==0) return 0;
  rv=SCardListReaders(hContext,NULL,NULL,&cch);
  S_TRACE("SCardListReaders(NULL): %d\n", rv);
  readerNames = (LPTSTR)malloc(cch);
  if (readerNames == NULL) return 0;
  rv=SCardListReaders(hContext,NULL,readerNames,&cch);
  if (rv==SCARD_S_SUCCESS)
  {
    int q=0;
    LPTSTR pReader=readerNames;
    do {
      if (q==nReader) {
        rv=SCardConnect(hContext,pReader,SCARD_SHARE_SHARED,
          SCARD_PROTOCOL_T1,&hCard,&dwAP);
		if (rv!=SCARD_S_SUCCESS){
			S_TRACE("SCardConnect: %d\n", rv);
			hCard=0;
		}
		else
			S_TRACE("SCardConnect: hContext: 0x%08X, hCard:0x%08X\n", hContext,hCard);
        break;
      }else
        pReader+=strlen(pReader)+1;
      q++;
    } while ((*pReader!='\0')&&(q<=nReader));
  }
  else
	  S_TRACE("SCardListReaders: %d\n", rv);
  free(readerNames);
  return hCard;
}

int CALLINGCONV BeginTransactionML(int nSlot)
{
	LONG rv = SCARD_E_UNEXPECTED;
	S_TRACE("    BeginTransactionML: %d\n", nSlot);
	if (hCardsTransactions[nSlot] == 0)
	{
		rv = SCardBeginTransaction(hCards[nSlot]);
		S_TRACE("    BeginTransactionML: SCardBeginTransaction: %d\n", rv);
	}
	hCardsTransactions[nSlot] += 1;
	S_TRACE("    BeginTransactionML: counter=%d\n", hCardsTransactions[nSlot]);

	return C_OK;
}

int CALLINGCONV EndTransactionML(int nSlot)
{
	LONG rv = SCARD_S_SUCCESS;
	S_TRACE("    EndTransactionML: %d, counter=%d\n", nSlot, hCardsTransactions[nSlot]);
	if (hCardsTransactions[nSlot] > 0)
	{
		hCardsTransactions[nSlot] -= 1;
		if (hCardsTransactions[nSlot] == 0)
		{
			rv = SCardEndTransaction(hCards[nSlot], SCARD_LEAVE_CARD);
			S_TRACE("    EndTransactionML: SCardEndTransaction: %d\n", rv);
		}
	}
	return C_OK;
}

int CALLINGCONV BeginTransaction()
{
	return BeginTransactionML(defSlot);
}

int CALLINGCONV EndTransaction()
{
	return EndTransactionML(defSlot);
}



/* La funzione Initialize effettua le seguenti operazioni:   */
/* - Stabilisce il contesto PC/SC con il resource manager    */
/* - Effettua la connessione con il lettore (slot) richiesto */
/* - Inizializza le variabili di ambiente                    */
/* - Sancisce l'inizio di una transazione PC/SC              */
int CALLINGCONV Initialize(int nSlot)
{
  long rv=SCARD_S_SUCCESS;
  DWORD rL=0;
  DWORD dwState=0;
  DWORD dwProtocol=0;
  BYTE *pbAtr=NULL;
  DWORD cByte=0;
  S_TRACE("\n\n\n");
  S_TRACE("Initialize: nSlot=%d\n", nSlot);
  if (instances==0) {
    /* Alla prima Initialize preparo il contesto PC/SC */
    rv=SCardEstablishContext(SCARD_SCOPE_USER,NULL,NULL,&hContext);
    if (rv!=SCARD_S_SUCCESS) {
      initialized=FALSE;
      hContext=0;
	  S_TRACE("SCardEstablishContext: %d\n", rv);
      return C_CONTEXT_ERROR;
    }
    /* Reinizializzo l'array di handle dei lettori */
    memset(hCards,0,sizeof(hCards) * sizeof(hCards[0]));
	memset(hCardsTransactions,0,sizeof(hCardsTransactions) * sizeof(hCardsTransactions[0]));
  }
  if (hCards[nSlot]!=0) return C_ALREADY_INITIALIZED;
  else {
    hCards[nSlot]=Connect(nSlot);
    if (hCards[nSlot]!=0) {
      // SCardBeginTransaction(hCards[nSlot]);
      if (instances==0) defSlot=nSlot;
      instances++; /* Incremento il reference counter */
      initialized=TRUE;
      return C_OK;
    } else return C_NO_CARD;
  }
}

/* La funzione Finalize effettua le seguenti operazioni: */
/* - Termina la transazione PC/SC                        */
/* - Chiude il canale PC/SC con la carta                 */
/* - Rilascia il contesto PC/SC hContMLt                 */
int CALLINGCONV FinalizeML(int nSlot)
{
	LONG rv;
  S_TRACE("FinalizeML: nSlot=%d\n", nSlot);
  
  if (hCards[nSlot]==0) return C_NOT_INITIALIZED;
  //rv = SCardEndTransaction(hCards[nSlot],SCARD_LEAVE_CARD);
  //S_TRACE("FinalizeML: SCardEndTransaction %d\n", rv);
  rv = SCardDisconnect(hCards[nSlot],SCARD_RESET_CARD);
  S_TRACE("FinalizeML: SCardDisconnect %d\n", rv);

  hCards[nSlot]=0;
  instances--;
  if (instances==0) {
    rv = SCardReleaseContext(hContext);
	S_TRACE("FinalizeML: SCardReleaseContext %d\n", rv);
    hContext=0;
    initialized=FALSE;
  }
  S_TRACE("\n\n\n");
  return C_OK;
}

int CALLINGCONV Finalize()
{
  return FinalizeML(defSlot);
}

/* La funzione Hash è stata implementata nel presente file    */
/* in quanto, in essa, vengono chiamate funzioni di OpenSSL   */
/* qualora l'ambiente di interesse non supporti tale libreria */
/* è necessario provvedere ad una implementazione equivalente */
/* della funzione.                                            */
int CALLINGCONV Hash(int mec,BYTE *toHash, int Len, BYTE *Hashed)
{
  int x=0;
  switch (mec)
  {
    case HASH_SHA1:
      x=SHA1(toHash,Len,Hashed);
    break;
    case HASH_MD5:
      x=MD5(toHash,Len,Hashed);
    break;
    default:
    return C_GENERIC_ERROR;
  }
  return C_OK;
}

/* La funzione SendAPDU invia una APDU alla smart card */
int CALLINGCONV SendAPDUML(int nSlot, DWORD cmd, BYTE Lc, BYTE *pLe,
                    BYTE *inBuffer, BYTE *outBuffer, WORD *pSW)
{
  long rv=SCARD_S_SUCCESS;
  SCARDHANDLE hCard = hCards[nSlot];
  DWORD dwProto = 0;
  DWORD tLen=256;
  BYTE tmpBuf[256];
  BYTE pSendBuffer[256];
  DWORD lSB; /*lunghezza del buffer da inviare alla carta*/
  pSendBuffer[0]=(BYTE)((cmd&0xff000000)>>24);
  pSendBuffer[1]=(BYTE)((cmd&0x00ff0000)>>16);
  pSendBuffer[2]=(BYTE)((cmd&0x0000ff00)>>8);
  pSendBuffer[3]=(BYTE) (cmd&0x000000ff);
  lSB=4;
  if (Lc!=0) {
    pSendBuffer[4]=Lc;
    memcpy(pSendBuffer+5,inBuffer,Lc);
    lSB+=Lc+1;
  }

  if (pSendBuffer[1]!=0xa4) {
    pSendBuffer[lSB]=(pLe!=NULL)?*pLe:0;
    lSB++;
  }

retryTransmit:
  S_TRACE("    SendAPDUML: SCardTransmit: APDUHEADER=0x%08X \n", cmd);
  S_TRACE_BUFFER("   SendAPDUML: APDU:", pSendBuffer, lSB);
  tLen=256;
  rv=SCardTransmit(hCard,SCARD_PCI_T1,pSendBuffer,lSB,NULL,tmpBuf,&tLen);
  S_TRACE("    SendAPDUML: SCardTransmit rv=0x%08X \n", rv);
  if (rv == SCARD_S_SUCCESS)
	  S_TRACE_BUFFER("   SendAPDUML: RESPONSE:", tmpBuf, tLen);
  if (rv!=SCARD_S_SUCCESS) {
    if (pLe!=NULL) *pLe=0;
    switch (rv) {
	case SCARD_W_RESET_CARD:
		S_TRACE("    SendAPDUML: SCardTransmit error: %d (SCARD_W_RESET_CARD)\n", rv);
		rv = SCardReconnect(hCard, SCARD_SHARE_SHARED, SCARD_PROTOCOL_T1, SCARD_LEAVE_CARD, &dwProto);
		S_TRACE("    SendAPDUML: SCardReconnect rv=%d\n", rv);
		if (hCardsTransactions[nSlot] > 0)
		{
			rv = SCardBeginTransaction(hCard);
			S_TRACE("    SendAPDUML: SCardBeginTransaction rv=%d\n", rv);
		}
		if (rv == SCARD_S_SUCCESS)
		{
			S_TRACE("    SendAPDUML: retrying transmit...\n");
			goto retryTransmit;
		}
    case SCARD_E_NO_SMARTCARD:
    case SCARD_E_NOT_READY:
    case SCARD_E_READER_UNAVAILABLE:
    case SCARD_W_REMOVED_CARD:
    return C_NO_CARD;
    default:
		S_TRACE("SCardTransmit: %d, hCard: 0x%08X\n", rv, hCard);
    return C_GENERIC_ERROR;
    }
  } else *pSW=(tmpBuf[tLen-2]<<8)|tmpBuf[tLen-1];
  if (tLen>2) {
    if (outBuffer!=NULL)
      memcpy(outBuffer,tmpBuf,(*pLe>tLen-2)?(tLen-2):*pLe);
    if (pLe!=NULL)
      if ((*pLe>tLen-2)||(outBuffer==NULL)) *pLe=(BYTE)(tLen-2);
  }
  return C_OK;
}

int CALLINGCONV SendAPDU(DWORD cmd, BYTE Lc, BYTE *pLe,
                    BYTE *inBuffer, BYTE *outBuffer, WORD *pSW)
{
  return SendAPDUML(hCards[defSlot],cmd,Lc,pLe,inBuffer,outBuffer,pSW);
}

int CALLINGCONV isCardIn(int n)
{
  SCARDCONTEXT lContext;
  char *readerNames;
  char *p;
  DWORD cch;
  int d,b;
  long ris;
  SCARD_READERSTATE rs;
  ris=SCARD_S_SUCCESS;
  lContext=0;
  readerNames=NULL;
  d=0; b=0; cch=0; 
  ris=SCardEstablishContext(SCARD_SCOPE_USER, NULL, NULL, &lContext);
  if ((lContext==0)||(ris!=SCARD_S_SUCCESS)) return b;
  if (lContext!=0) {
    ris=SCardListReaders(lContext,NULL,NULL,&cch);
    readerNames = (LPTSTR)malloc(cch);
    ris=SCardListReaders(lContext,NULL,readerNames,&cch);
    if (readerNames != NULL) {
      p=readerNames;
      while ((*p!='\0')&&(d<n)&&(readerNames!=NULL)) {
        p+=strlen(p)+1;
        d++;
      }
      if (d==n) {
        rs.szReader=p;
        rs.pvUserData=NULL;
        rs.dwCurrentState=SCARD_STATE_UNAWARE;
        /*
        SCARD_READERSTATE rs={
          p, NULL, SCARD_STATE_UNAWARE, NULL, NULL
        };*/
        ris=SCardGetStatusChange(lContext, 0 , &rs, 1);
        if (ris!=SCARD_S_SUCCESS) return FALSE;
        b=(rs.dwEventState&SCARD_STATE_PRESENT);
      }
    }
  }
  if (readerNames!=NULL) free(readerNames);
  if (lContext!=0) SCardReleaseContext(lContext);
  return b;
}
