#ifdef HAVE_CONFIG_H
#include <config.h>
#endif
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "cDynlib.h"


#if defined(WIN32) || defined(_WIN32_WCE)
#include <windows.h>

DYN_HANDLE dyn_LoadLibrary(const char* szLib)
{
#ifdef _WIN32_WCE
    wchar_t wszLib[MAX_PATH] = {0};
    MultiByteToWideChar(CP_ACP, 0, szLib, strlen(szLib), wszLib, MAX_PATH -1);
    return (DYN_HANDLE)LoadLibraryW(wszLib);
#else
    return (DYN_HANDLE)LoadLibraryA(szLib);
#endif
}

int dyn_FreeLibrary(DYN_HANDLE pLib)
{
    return FreeLibrary((HMODULE)pLib);
}

void * dyn_GetProcAddress(DYN_HANDLE pLib, const char* szAddress)
{
#ifdef _WIN32_WCE
    wchar_t wszAddress[1024] = {0};
    MultiByteToWideChar(CP_ACP, 0, szAddress, strlen(szAddress), wszAddress, 1024 -1);
    return GetProcAddressW((HMODULE)pLib, wszAddress);
#else
    return GetProcAddress((HMODULE)pLib, szAddress);
#endif
}

#elif defined(HAVE_DLFCN_H) || defined(__linux__)
#include <dlfcn.h>
DYN_HANDLE dyn_LoadLibrary(const char* szLib)
{
    DYN_HANDLE p =  dlopen(szLib, RTLD_NOW|RTLD_LOCAL);
    if (!p)
        perror("load error");
    return p;
}

int dyn_FreeLibrary(DYN_HANDLE pLib)
{
    dlclose(pLib);
	return 1;
}

void * dyn_GetProcAddress(DYN_HANDLE pLib, const char* szAddress)
{
    void *address = dlsym(pLib, szAddress);
    return address;
}



#else
#error "Dynamic load not supported!"

#endif
