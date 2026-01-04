#ifndef LIBSIAECARDT_H
#define LIBSIAECARDT_H

#ifdef __cplusplus
extern "C" {
#endif

#if !defined(USE_STDCALL)
#define USE_STDCALL 1
#endif

#ifdef _WIN32
#   if USE_STDCALL == 1
#       define CALLINGCONV_1 _stdcall
#   else 
#       define CALLINGCONV_1
#   endif

#   if defined(LIBSIAE_EXPORTS)
#       define LIBSIAEAPI __declspec(dllexport)
#   else
#       define LIBSIAEAPI __declspec(dllimport)
#   endif

#   define CALLINGCONV LIBSIAEAPI CALLINGCONV_1


#else // ! _WIN32
#   define CALLINGCONV 
#   define LIBSIAEAPI
#	define CALLINGCONV_1
typedef unsigned int UINT;
#endif  // _WIN32





/* Definizione tipi utilizzati nella libreria */
#define TRUE 1
#define FALSE 0

/* Costanti per i tipi di file */
#define EF_BINARY                     0x01
#define EF_LINEAR_FIXED               0x02
#define EF_FIXED_TLV                  0x03
#define EF_LINEAR_VARIABLE            0x04
#define EF_LINEAR_VARIABLE_TLV        0x05
#define EF_CYCLIC                     0x06
#define EF_CYCLIC_TLV                 0x07

/* Definizione dei messaggi di errore */
#define C_OK                          0x0000
#define C_CONTEXT_ERROR               0x0001
#define C_NOT_INITIALIZED             0x0002
#define C_ALREADY_INITIALIZED         0x0003
#define C_NO_CARD                     0x0004
#define C_UNKNOWN_CARD                0x0005
#define C_WRONG_LENGTH                0x6282
#define C_WRONG_TYPE                  0x6981
#define C_NOT_AUTHORIZED              0x6982
#define C_PIN_BLOCKED                 0x6983
#define C_WRONG_DATA                  0x6A80
#define C_FILE_NOT_FOUND              0x6A82
#define C_RECORD_NOT_FOUND            0x6A83
#define C_WRONG_LEN                   0x6A85
#define C_UNKNOWN_OBJECT              0x6A88
#define C_ALREADY_EXISTS              0x6A89
#define C_GENERIC_ERROR               0xFFFF

#define HASH_SHA1                     0x01
#define HASH_MD5                      0x02

#define MAX_READERS 16

#ifdef __cplusplus
};
#endif

#endif // LIBSIAECARDT_H

