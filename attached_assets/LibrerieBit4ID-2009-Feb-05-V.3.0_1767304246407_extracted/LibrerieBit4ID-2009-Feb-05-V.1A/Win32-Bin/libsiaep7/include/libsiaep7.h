#ifndef LIBSIAEV3_H
#define LIBSIAEV3_H

#include "libsiaecard.h"

#ifdef __cplusplus
extern "C" {
#endif

/*
	PKCS7SignML(): crea un pacchetto PKCS#7 firmato usando la smartcard SIAE
*/

int CALLINGCONV PKCS7SignML(
	const char *pin, // pin smartcard
	unsigned long slot, // slot da utilizzare, zero based
	const char* szInputFileName, // nome del file di input
	const char* szOutputFileName, // nome del file di output
	int bInitialize);

typedef int (CALLINGCONV_1 *t_PKCS7SignML)(
	const char *pin,
	unsigned long slot,
	const char* szInputFileName,
	const char* szOutputFileName,
	int bInitialize);

/*
SMIMESignML(): crea un messaggio S/MIME firmato ed eventualmente cifrato (anche per più destinatari)
*/

int CALLINGCONV SMIMESignML(
	const char* pin,			// Parametri uguali
	unsigned long slot, // a quelli di firmaSIAE

	const char* szOutputFilePath, // File in cui salvare il file in formato RFC822 - S/MIME

	const char* szFrom, // Campo 'From:' dello header rfc822.
			// Es.1: "Giuseppe Verdi" <gverdi@xcom.it>
			// Es.2: gverdi@xcom.it

	const char* szTo, // Campo 'To:' dello header rfc822.
			//Es: vedere parametro szFrom

	   // [Opzionale]
	const char* szSubject, // Subject del messaggio
				// Dovrebbe contenere solo testo ASCI a 7 bit
				// (alcuni server ammettono testo ASCII-8bit)

	   // [Opzionale]
	const char* szOtherHeaders, // Header rfc822/MIME aggiuntivi
				// Es.1: X-Priority: 3
				// Es.2: References: 198325897234@xcom.it; sdiof24323432423@email.it

	const char* szBody, // Contenuto del BODY del messaggio.
					// Deve contenere solo testo ASCII-7bit
					// (alcuni server ammettono testo ASCII-8bit)

	   // [Opzionale]:
	const char* szAttachments, // files da allegare separati dal carattere ';'
	   	// es: c:\file1.txt;c:\temp\tmpfile.pdf
		// è possibile specificare il nome di ogni allegato specificandone il valore
		// prima del percorso dell'allegato stesso.
		// es: file_a.txt|c:\file1.txt;file_b.pfd|c:\temp\tmpfile.pdf

	unsigned long dwFlags, // Riservato per usi futuri, specificare 0
	int bInitialize
);


typedef int (CALLINGCONV_1 *t_SMIMESignML)(
	const char* pin,
	unsigned long slot,
	const char* szOutputFilePath,
	const char* szFrom,
	const char* szTo,
	const char* szSubject,
	const char* szOtherHeaders,
	const char* szBody,
	const char* szAttachments,
	unsigned long dwFlags,
	int bInitialize
);


#ifdef __cplusplus
};
#endif

#endif // LIBSIAEV3_H




