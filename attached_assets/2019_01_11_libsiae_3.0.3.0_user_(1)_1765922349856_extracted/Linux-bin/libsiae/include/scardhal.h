#ifndef SCARDHAL_H
#define SCARDHAL_H

#include "libsiaecardt.h"

#ifdef __cplusplus
extern "C" {
#endif

#if defined(WIN32)
#       include <winscard.h>
#pragma comment(lib,"winscard.lib")
#elif defined(__linux__)
#       include <winscard.h>
#elif defined(__MACH__)
#       include <PCSC/wintypes.h>
#       include <PCSC/winscard.h>
#else
#       include <winscard.h>
#endif

int CALLINGCONV isCardIn(int n);
int CALLINGCONV IsInitialized();
int CALLINGCONV Initialize(int Slot);
int CALLINGCONV Finalize();
int CALLINGCONV FinalizeML(int nSlot);
int CALLINGCONV Hash(int mec,BYTE *toHash, int Len, BYTE *Hashed);
int CALLINGCONV SendAPDU(DWORD cmd, BYTE Lc, BYTE *pLe, BYTE *inBuffer, BYTE *outBuffer, WORD *pSW);
int CALLINGCONV SendAPDUML(SCARDHANDLE hCard, DWORD cmd, BYTE Lc, BYTE *pLe, BYTE *inBuffer, BYTE *outBuffer, WORD *pSW);


#ifdef __cplusplus
};
#endif

#endif // SCARDHAL_H


