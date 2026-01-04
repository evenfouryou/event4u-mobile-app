
CFLAGS=-DHAVE_DLFCN_H -I./include -I/usr/include/PCSC -I/usr/local/include/PCSC -I/usr/include -I/usr/local/include -I. -fPIC -Wall
all:
	gcc $(CFLAGS) -c -o test-test.o test.c
	gcc $(CFLAGS) -c -o test-cDynlib.o cDynlib.c
	if [ "x`uname`" = "xDarwin" ] ; then \
		gcc -fPIC -Wall -o test test-test.o test-cDynlib.o -lm; \
	else \
		gcc -fPIC -Wall -o test test-test.o test-cDynlib.o -lm -ldl; \
	fi
