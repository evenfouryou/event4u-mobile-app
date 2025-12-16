#ifndef _UTILITY_H_
#define _UTILITY_H_ 1

#if _MSC_VER > 1000
#pragma once
#endif // _MSC_VER > 1000

#ifdef __cplusplus
extern "C" {
#endif

	int MemWriteFile(const char* lpFileName, const unsigned char* lpbAddress, size_t dwNumberOfBytesWrite); 

#ifdef __cplusplus
};
#endif

#endif // _UTILITY_H_

