#ifndef _DYNLIB_H_
#define _DYNLIB_H_

#ifdef __cplusplus
extern "C"
{
#endif

typedef void* DYN_HANDLE;

extern DYN_HANDLE dyn_LoadLibrary(const char* szLib);
extern int dyn_FreeLibrary(DYN_HANDLE pLib);
extern void * dyn_GetProcAddress(DYN_HANDLE pLib, const char* szAddress);

#ifdef __cplusplus
}
#endif


#endif // _DYNLIB_H_
