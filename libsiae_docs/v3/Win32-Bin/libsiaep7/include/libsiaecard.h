#ifndef LIBSIAECARD_H
#define LIBSIAECARD_H

#include <stdio.h>
#include <memory.h>
#include <stdlib.h>

#if defined(WIN32)
#	include <winscard.h>
#elif defined(__linux__)
#	include <winscard.h>
#elif defined(__MACH__)
#	include <PCSC/wintypes.h>
#	include <PCSC/winscard.h>
#else
#	include <winscard.h>
#endif

#include "libsiaecardt.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Funzioni per la gestione dei file */
int CALLINGCONV Select(WORD fid);
int CALLINGCONV SelectML(WORD fid, int nSlot);

int CALLINGCONV ReadBinary(WORD Offset, BYTE *Buffer, int *Len);
int CALLINGCONV ReadBinaryML(WORD Offset, BYTE *Buffer, int *Len, int nSlot);
int CALLINGCONV ReadRecord( int nRec, BYTE* Buffer, int *Len);
int CALLINGCONV ReadRecordML( int nRec, BYTE* Buffer, int *Len, int nSlot);
int CALLINGCONV GetSN(BYTE serial[8]);
int CALLINGCONV GetSNML(BYTE serial[8],int nSlot);

/* Funzioni per la gestione del PIN */
int CALLINGCONV VerifyPIN(int nPIN, char *pin);
int CALLINGCONV VerifyPINML(int nPIN, char *pin, int nSlot);
int CALLINGCONV ChangePIN(int nPIN, char *Oldpin, char *Newpin);
int CALLINGCONV ChangePINML(int nPIN, char *Oldpin, char *Newpin, int nSlot);
int CALLINGCONV UnblockPIN(int nPIN, char *Puk, char *Newpin);
int CALLINGCONV UnblockPINML(int nPIN, char *Puk, char *Newpin, int nSlot);

/* Funzioni per la gestione dei contatori */
int CALLINGCONV ReadCounter(DWORD *value);
int CALLINGCONV ReadCounterML(DWORD *value, int nSlot);
int CALLINGCONV ReadBalance(DWORD *value);
int CALLINGCONV ReadBalanceML(DWORD *value, int nSlot);
int CALLINGCONV ComputeSigillo(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt);
int CALLINGCONV ComputeSigilloML(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt,int nSlot);
int CALLINGCONV ComputeSigilloEx(BYTE *Data_Ora,DWORD Prezzo,BYTE *mac,DWORD *cnt);
int CALLINGCONV ComputeSigilloExML(BYTE *Data_Ora,DWORD Prezzo,BYTE *mac,DWORD *cnt, int nSlot);
int CALLINGCONV ComputeSigilloFast(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt);
int CALLINGCONV ComputeSigilloFastML(BYTE *Data_Ora,DWORD Prezzo,BYTE *SN,BYTE *mac,DWORD *cnt, int nSlot);

/* Funzioni per la gestione delle operazioni crittografiche */
int CALLINGCONV Padding(BYTE *toPad, int Len, BYTE *Padded);
int CALLINGCONV Hash(int mec,BYTE *toHash, int Len, BYTE *Hashed);
int CALLINGCONV Sign(int kx,BYTE *toSign,BYTE *Signed);
int CALLINGCONV SignML(int kx,BYTE *toSign,BYTE *Signed, int nSlot);
BYTE CALLINGCONV GetKeyID();
BYTE CALLINGCONV GetKeyIDML(int nSlot);
int CALLINGCONV GetCertificate(BYTE *cert, int* dim);
int CALLINGCONV GetCertificateML(BYTE *cert, int* dim, int nSlot);
int CALLINGCONV GetCACertificate(BYTE *cert, int* dim);
int CALLINGCONV GetCACertificateML(BYTE *cert, int* dim, int nSlot);
int CALLINGCONV GetSIAECertificate(BYTE *cert, int* dim);
int CALLINGCONV GetSIAECertificateML(BYTE *cert, int* dim, int nSlot);

int CALLINGCONV BeginTransactionML(int nSlot);
int CALLINGCONV EndTransactionML(int nSlot);
int CALLINGCONV BeginTransaction();
int CALLINGCONV EndTransaction();

#ifdef __cplusplus
};
#endif


#endif // LIBSIAECARD_H

