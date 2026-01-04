#include "libsiaecard.h"
#include <stdio.h>

#include "utility.h"


int MemWriteFile(const char* lpFileName, const unsigned char* lpbAddress, size_t dwNumberOfBytesWrite)
{
  FILE* f;
  f = fopen(lpFileName, "wb+");

  if(!f) return FALSE;
  fwrite(lpbAddress, 1, dwNumberOfBytesWrite, f);
  fclose(f);
  f=NULL;
  return TRUE;
}

