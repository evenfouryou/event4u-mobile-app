#ifndef INTERNALS_H
#define INTERNALS_H

#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#if defined(WIN32) || defined(_WIN32)
#include <process.h>
#elif defined(__MACH__) || defined(__linux__)
#include <unistd.h>
#endif

#ifdef _WIN32
#	define getpid _getpid
#endif
static void _S_TRACE(const char* szFormat, ...)
{
	char szLogPath[128] = {0};
	time_t t;
	struct tm m = {0};
    FILE* f;
	va_list va;
    #if defined(WIN32) || defined(_WIN32)
        char szSysPath[MAX_PATH];
        GetSystemDirectoryA(szSysPath, sizeof(szSysPath));
        sprintf(szLogPath, "%c:/libsiaelog/libsiae.log", szSysPath[0]);
    #else
        strcpy(szLogPath, "/libsiaelog/libsiae.log");
    #endif
    f = fopen(szLogPath, "ab+");
    if (f)
    {
		t = time(NULL);
		m = *localtime(&t);
		fprintf(f, "[%04d, %02d:%02d:%02d, %08d] ", getpid(), m.tm_hour, m.tm_min, m.tm_sec, clock());
        va_start(va, szFormat);
        vfprintf(f, szFormat, va);
        fclose (f);
        va_end(va);
    }
    #ifdef _DEBUG
    va_start(va, szFormat);
	vfprintf(stderr, szFormat, va);
	va_end(va);
    #endif
}


#define S_TRACE _S_TRACE
static void S_TRACE_BUFFER(const char* NAME, const unsigned char* BUFF, size_t LEN)
{
	size_t i;
	size_t L = LEN * 2 + 1;
	char* szBuf = (char*)malloc(L);
	memset(szBuf, 0, L);
	for(i=0;i<LEN;i++)
		sprintf(szBuf+(i*2), "%02X", BUFF[i]);
	_S_TRACE("%s -> %s\n", NAME, szBuf);
	free(szBuf);
}

#ifdef __cplusplus
extern "C" {
#endif

/*****************************************************************************
  Definizioni di tipi e costanti utilizzati internamente
  alla libreria.
*****************************************************************************/

#ifndef NULL
#define NULL 0L
#endif

/* Costanti */
#define EXCHANGE_BUFFER 128

/* FID NOTEVOLI */
#define FID_MF              0x3f00
#define FID_SIAE_APP_DOMAIN 0x0000
#define FID_P11_APP_DOMAIN  0x1111
#define FID_SIAE_CNT_DOMAIN 0x1112
#define FID_EF_CNT          0x1000
#define FID_EF_BALANCE_CNT  0x1001

/* APDU */
#define APDU_SELECT         0x00a40000
#define APDU_READBINARY     0x00b00000
#define APDU_READRECORD     0x00b20000
#define APDU_VERIFYPIN      0x00200000
#define APDU_CRD            0x00240000
#define APDU_RRC            0x002C0000
#define APDU_READ_COUNTER   0x00320001
#define APDU_CMP_SIGILLO    0x00328312
#define APDU_MSE_RESTORE    0x0022f301
#define APDU_MSE            0x0022f1b8
#define APDU_SIGN           0x002a8086

/* Status Words */
#define SW_OK               0x9000
#define SW_WRONG_LENGTH     0x6282
#define SW_AUTH_FAILED      0x6300

#ifdef __cplusplus
};
#endif

#endif // INTERNALS_H

