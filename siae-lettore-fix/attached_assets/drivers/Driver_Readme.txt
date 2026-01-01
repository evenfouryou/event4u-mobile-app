Advanced Card Systems Ltd.
http://www.acs.com.hk 
Tel: +852 2796 7873
Fax: +852 2796 1286
e-mail: info@acs.com.hk


ACS Unified Driver
(Manual Installation)
---------------------------------------


Contents
--------

   1.  Release notes
   2.  File Contents
   3.  Supported Readers
   4.  Installation Notes
   5.  New Installation
       5.1. New Installation (Windows 2000)
       5.2. New Installation (Windows XP    & Server 2003 & Server 2003 R2)
       5.3. New Installation (Windows Vista & Server 2008)
       5.4. New Installation (Windows 7     & Windows 8   & Windows 8.1   & Server 2008 R2 & Server 2012  &  Server 2012 R2)
   6.  Driver Update    
       6.1. Driver Update    (Windows 2000)
       6.2. Driver Update    (Windows XP    & Server 2003 & Server 2003 R2)
       6.3. Driver Update    (Windows Vista & Server 2008)
       6.4. Driver Update    (Windows 7     & Windows 8   & Windows 8.1   & Server 2008 R2 & Server 2012  &  Server 2012 R2)
   7.  Check Installation
   8.  Driver Removal
   9.  Troubleshooting
   10. Support


1. Release notes
----------------

   This driver package supports the following operating systems:
   - Windows 2000
   - Windows XP             (x86 & x64)
   - Windows Vista          (x86 & x64)
   - Windows 7              (x86 & x64)
   - Windows 8              (x86 & x64)
   - Windows 8.1            (x86 & x64)
   - Windows Server 2003    (x86 & x64)
   - Windows Server 2008    (x86 & x64)
   - Windows Server 2008 R2 (x64)
   - Windows Server 2012    (x64)
   - Windows Server 2012 R2 (x64)

2. File Contents
----------------

   acsdrv.cat		x.x.x.x
   acsdrv.inf		x.x.x.x
   acsdrv.sys		4.0.0.4
   acsdrvbus.sys	4.0.0.4
   acsdrvicc.sys	4.0.0.4
   acsdrvpcc.sys	4.0.0.4
   acsdrvsam.sys	4.0.0.4
   acsdrvfnc.sys	4.0.0.4
   adrvusam.sys		4.0.0.1
   acsdrvtok.sys	4.0.0.1
   acsdrvsvr.sys	4.0.0.4
   acsdrvx64.sys	4.0.0.4
   acsdrvbusx64.sys	4.0.0.4
   acsdrviccx64.sys	4.0.0.4
   acsdrvpccx64.sys	4.0.0.4
   acsdrvsamx64.sys	4.0.0.4
   acsdrvfncx64.sys	4.0.0.4
   adrvusamx64.sys	4.0.0.4
   acsdrvtokx64.sys	4.0.0.1
   acsdrvsvrx64.sys	4.0.0.4
   acr30up.sys		3.0.0.2
   acr30upx64.sys	3.0.0.2
   aet63p.sys		1.0.1.4
   aet63px64.sys	1.0.1.4
   acscoi.dll		4.0.0.1
   acscoix64.dll	4.0.0.1
   usbr30.dll		1.0.0.1
   usbr30x64.dll	1.0.0.1
   Usbr38.dll		1.0.5.0
   Usbr38x64.dll	1.0.5.0
   Release.txt  

3. Supported Readers
---------------------

  CCID Readers

   VID  PID  Reader                  Reader Name
   ---- ---- ----------------------- -----------------------------   
   072F B301 ACR32-A1                ACS ACR32 ICC Reader
   072F 8300 ACR33-A1                ACS ACR33U-A1 3SAM ICC Reader   
   072F 8302 ACR33-A2                ACS ACR33U-A2 3SAM ICC Reader
   072F 8307 ACR33-A3                ACS ACR33U-A3 3SAM ICC Reader
   072F 8301 ACR33XX-4SAM            ACS ACR33U 4SAM ICC Reader 
   072F 90CC ACR38U-CCID/ACR100F     ACS CCID USB Reader  
   072F 90D8 ACR3801                 ACS ACR3801
   072F B100 ACR39U                  ACS ACR39 ICC Reader
   072F B000 ACR3901U                ACS ACR3901 ICC Reader
   072F 90D2 ACR83U-A1               ACS ACR83U
   072F 2010 ACR88U CCID             ACS ACR88
   072F 8900 ACR89U-A1               ACS ACR89 ICC Reader
   072F 8901 ACR89-A2/A3             ACS ACR89 Dual Reader
   072F 8902 ACR89U FP               ACS ACR89 FP Reader
   072F 1205 ACR100I                 ACS ACR100 ICC Reader
   072F 1204 ACR101                  ACS ACR101 ICC Reader   
   072F 1206 ACR102                  ACS ACR102 ICC Reader
   072F 2200 ACR122U/T               ACS ACR122
   072F 2214 ACR1222U-C1             ACS ACR1222 1 SAM PICC Reader
   072F 1280 ACR1222U-C3             ACS ACR1222 1 SAM Dual Reader 
   072F 2207 ACR1222U-C6             ACS ACR1222 Dual Reader  
   072F 2206 ACR1222L-D1             ACS ACR1222 3S PICC Reader   
   072F 2219 ACR123 Bootloader       ACS ACR123US_BL
   072F 222E ACR123U-A1              ACS ACR123 3S Reader
   072F 2237 ACR123U                 ACS ACR123 Reader
   072F 221A ACR1251U-A1             ACS ACR1251 1S CL Reader
   072F 2229 ACR1251U-A2             ACS ACR1251 CL Reader PICC
   072F 221B ACR1251U-C              ACS ACR1251U Smart Card Reader
   072F 2218 ACR1251U-C (SAM)        ACS ACR1251U-C Smart Card Reader
   072F 2232 ACR1251U-K              ACS ACR1251K Dual Reader
   072F 2242 ACR1251U-C3             ACS ACR1251 1S Dual Reader   				      
   072F 223B ACR1252U-A1             ACS ACR1252 1S CL Reader
   072F 223E ACR1252U-A2             ACS ACR1252 CL Reader PICC
   072F 223D ACR1252U Bootloader     ACS ACR1252 USB FW_Upgrade v100 
   072F 2239 ACR1256U                ACS ACR1256U PICC Reader
   072F 2211 ACR1261U-C1             ACS ACR1261 1S Dual Reader 
   072F 2100 ACR128U                 ACS ACR128U   
   072F 2224 ACR1281U-C1             ACS ACR1281 1S Dual Reader
   072F 220F ACR1281U-C2 (qPBOC)     ACS ACR1281 CL Reader
   072F 2223 ACR1281U    (qPBOC)     ACS ACR1281 PICC Reader     
   072F 2208 ACR1281U-C3 (qPBOC)     ACS ACR1281 Dual Reader 
   072F 0901 ACR1281U-C4 (BSI)       ACS ACR1281 PICC Reader
   072F 220A ACR1281U-C5 (BSI)       ACS ACR1281 Dual Reader  
   072F 2215 ACR1281U-C6             ACS ACR1281 2S CL Reader      
   072F 2220 ACR1281U-C7             ACS ACR1281 1S PICC Reader                   
   072F 2233 ACR1281U-K (PICC)       ACS ACR1281U-K PICC Reader
   072F 2234 ACR1281U-K (Dual)       ACS ACR1281U-K Dual Reader
   072F 2235 ACR1281U-K (1S)         ACS ACR1281U-K 1S Dual Reader
   072F 2236 ACR1281U-K (4S)         ACS ACR1281U-K 4S Dual Reader 
   072F 220C ACR1283 Bootloader      ACS ACR1283U FW Upgrade
   072F 2213 ACR1283L-D1             ACS ACR1283 4S CL Reader
   072F 222C ACR1283L-D2             ACS ACR1283 CL Reader PICC 
   072F 0102 AET62                   ACS AET62 PICC Reader PICC
   072F 0103 AET62 (1S)              ACS AET62 1SAM PICC Reader
   072F 8002 AET63U                  ACS BioTRUSTKey     
   072F 0100 AET65                   ACS AET65 ICC Reader ICC     
   072F 8201 APG8201                 ACS APG8201    
   072F 90DB CryptoMate64            ACS CryptoMate64 
   072F B200 CryptoMate (T1)         ACS CryptoMate (T1)
   072F B106 CryptoMate (T2)         ACS CryptoMate (T2) 
         

   non-CCID Readers

   VID  PID  Reader                  Reader Name
   ---- ---- ----------------------- -----------------------------
   072F 0001 ACR30                   ACS USB   		
   072F 9000 ACR38 FW110             ACS ACR38U
   072F 90CF ACR38USAM               ACS ACR38USB   
   072F 2011 ACR88                   ACS ACR88
   072F 0101 AET65 (1S)              ACS AET65 1SAM ICC Reader   
   072F 9006 CryptoMate              ACS CryptoMate
	

4. Installation Notes
---------------------

   This document describes manual installation/uninstallation of the drivers for an ACS Smart Card 
   Reader. Please note that in order to install the drivers you have to be logged in as an 
   Administrator (or at least have access to an Administrator account in Windows XP or newer OS's).


5. New Installation
-------------------    

5.1. New Installation (Windows 2000)
------------------------------------

   1) Unzip the package to an easy to find location (e.g. the desktop).

   2) Plug the smart card reader into a free USB port.

   3) The 'Found New Hardware' wizard will appear, please follow the following steps:

     a) in the first screen, click 'Next'.

     b) In the second screen, select 'Search for a suitable driver for my device (recommended)' and
        click 'Next'.
 
     c) In the next screen, check 'Specify a location' and click 'Next'.

       Note: if is known that the driver is available through Windows Update, 
             'Microsoft Windows Update' can be checked as well. 

     d) In the dialog box that opens, enter the location of the driver package saved in step 1, 
        or choose 'Browse' to select the location. Press 'OK' to close the dialog.

     e) In the next screen (confirming the driver), click 'Next' to start installation.
   
     f) The wizard will start to install the driver at this time. 

        Note: A window may appear that the chosen driver is not digitally signed, you will be 
              asked if you want to continue the installation. Click on the 'Yes' button to continue.

     g) After the installation has finished, click 'Finish' to close the wizard.

   4) Installation is now complete and the smart card reader is ready for use.


5.2. New Installation (Windows XP & Server 2003 & Server 2003 R2)
------------------------------------------------

   1) Unzip the package to an easy to find location (e.g. the desktop).

   2) Plug the smart card reader into a free USB port.

   3) The 'Found New Hardware Wizard' will appear, please follow the following steps:

      a) In the first screen, choose 'Yes, this time only' if you know the driver is available on 
         Windows Update or choose 'No, not this time' to skip searching Windows Update. 
         Click 'Next' to continue.

      b) In the second screen, select 'Install from a list or specific location (Advanced)' and
         click 'Next'.
 
      c) In the third screen, select 'Search for the best driver in these locations'. 
         Then check 'Include this location in the search:' and enter the location of the driver 
         package saved in step 1, or choose 'Browse' to select the location. 
         Click 'Next' to continue...

      d) The wizard will start to install the driver at this time. 

         Note: A window may appear that the chosen driver is not digitally signed, you will be 
               asked if you want to continue the installation. 
               Click on the 'Continue Anyway' button to continue.

      e) After the installation has finished, click 'Finish' to close the wizard.
        
   4) Installation is now complete and the smart card reader is ready for use.
  
   Note: If after step d in the 'Found New Hardware Wizard', the driver could not be installed, 
         please follow the following steps:
  
            a) Click 'Back', the wizard will go back to step c.

            b) Choose 'Don't search, I will choose the driver to install' and click 'Next'.

            c) In the next screen, press 'Have Disk...'. In the dialog box that opens, enter the 
               location of the driver package saved in step 1, or choose 'Browse' to select the 
               location. Press 'OK' to close the dialog.

            d) Select the displayed model, and click 'Next' to start installation.

            e) The wizard will start to install the driver at this time. 

               Note: A window may appear that the chosen driver is not digitally signed, you will be 
                     asked if you want to continue the installation. 
                     Click on the 'Yes' button to continue.

            f) After the installation has finished, click 'Finish' to close the wizard.

         Installation is now complete and the smart card reader is ready for use.


5.3. New Installation (Windows Vista & Server 2008)
---------------------------------------------------

   1) Unzip the package to an easy to find location (e.g. the desktop).

   2) Plug the smart card reader into a free USB port.

   3) The 'Found New Hardware Wizard' will appear, please follow the following steps:

      a) In the first screen, click 'Locate and install driver software (recommended)'.

         Note 1: If User Account Control is enabled, a dialog will appear asking for permission.
                 Press 'Continue' to continue the installation.

         Note 2: By default, Windows Vista will try to find the driver on Windows Update first...
                 If this driver is available, the installation will automatically download and
                 install the driver. After installation is complete, press 'Close' to close the 
                 dialog. No steps have to be performed after this.

      b) If the driver is not available through Windows Update, a screen will appear asking for the 
         disk that came with the smart card reader. 
         Press 'I don't have the disc. Show me other options' to continue...

      c) In the next screen, choose 'Browse my computer for driver software (advanced)' to select
         the driver package.

      d) In the next screen, enter the location of the driver package saved in step 1, or choose 
         'Browse' to select the location in the dialog box that opens. 
         Then click 'Next' to continue...
 
      e) The wizard will start to install the driver at this time. 

         Note: A window may appear that the chosen driver is not digitally signed or that the driver
               has been signed by ACS, you will be asked if you want to continue the installation. 
               Click on the 'Install' button to continue.

      f) After the installation has finished, click 'Close' to close the wizard.

   4) Installation is now complete and the smart card reader is ready for use.


5.4. New Installation (Windows 7 & Windows 8  &  Windows 8.1   & Server 2008 R2 & Server 2012  &  Server 2012 R2)
--------------------------------------------------

   1) Unzip the package to an easy to find location (e.g. the desktop).

   2) Plug the smart card reader into a free USB port.

   3) By default, Windows 7 will try to find the driver on Windows Update first...
      If this driver is available, the installation will automatically download and
      install the driver. After installation is complete, press 'Close' to close the 
      dialog. No steps have to be performed after this.

      If the driver is not available, the installation will fail and a window will show 
      stating 'No driver found'. 
      In that case please follow the steps under 5.5. Driver Update (windows 7)!

   4) Installation is now complete and the smart card reader is ready for use.


6. Driver Update
----------------

6.1. Driver Update (Windows 2000)
---------------------------------

   1) Unzip the package to an easy to find location (e.g. the desktop).

   2) Make sure the smart card reader is plugged into a USB port.

   3) Open the Device Manager as follows:
   
      a) Press 'Start', choose 'Settings' and 'Control Panel' in the start menu.
	  
	    b) In the dialog that opens, choose 'Administrative Tools', then 'Computer Management'.
   
      c) In the dialog that opens, choose 'Device Manager' in the menu on the left.

      d) In the treeview that opens, choose 'Smart card readers', click the '+' sign to display
	       the installed smart card readers.

      e) The smart card reader to update should be present here.

   4) Rightclick on the smart card reader to update and choose 'Properties'.
   
   5) In the dialog that opens, select the tab-page called 'Driver' and click 'Update Driver...'.

   6) The 'Upgrade Device Driver Wizard' will appear, please follow the following steps:
        
      a) In the first screen, click 'Next' to continue.
	   
      b) In the second screen, select 'Display a list of the known drivers for this device so that 
	       I can choose a specific driver' and click 'Next'.

      c) In the next screen, press 'Have Disk...'. In the dialog box that opens, enter the location 
         of the driver package saved in step 1, or choose 'Browse' to select the location. 
         Press 'OK' to close the dialog.

      d) Select the displayed model, and click 'Next'.
	  
	    e) The next screen will show a confirmation, click 'Next' to start installation.

      f) The wizard will start to install the driver at this time. 

         Note: A window may appear that the chosen driver is not digitally signed, you will be 
               asked if you want to continue the installation. 
			   Click on the 'Yes' button to continue.

      g) After the installation has finished, click 'Finish' to close the wizard.
            
   7) The driver update is now complete and the smart card reader is ready for use.
   
   Note: The wizard might ask you to restart the computer in order to use the new driver. 
         Click 'Yes' to do so (make sure all applications are closed though and all documents 
         are saved).    


6.2. Driver Update (Windows XP & Server 2003)
---------------------------------------------

   1) Unzip the package to an easy to find location (e.g. the desktop).

   2) Make sure the smart card reader is plugged into a USB port.

   3) Open the Device Manager as follows:
   
      a) Press 'Start', and choose 'Control Panel' in the start menu.
	  
	    b) In the dialog that opens:
         - If Category View is enabled; choose 'Performance and Maintenance', in the view that 
           opens, choose 'Administrative Tools', then 'Computer Management'.
         - If Classic View is enabled; choose 'Administrative Tools', then 'Computer Management'.
         
      c) In the dialog that opens, choose 'Device Manager' in the menu on the left.

      d) In the treeview that opens, choose 'Smart card readers', click the '+' sign to display
	       the installed smart card readers.

      e) The smart card reader to update should be present here.

   4) Rightclick on the smart card reader and choose 'Update Driver...'.

   5) The 'Hardware Update Wizard' will appear, please follow the following steps:
         
      a) In the first screen, choose 'No, not this time' to skip searching Windows Update. 
         click 'Next' to continue.      

      b) In the second screen, select 'Install from a list or specific location (Advanced)' and
         click 'Next'.

      c) Choose 'Don't search, I will choose the driver to install' and press 'Next'.

      d) In the next screen, press 'Have Disk...'. In the dialog box that opens, enter the location 
         of the driver package saved in step 1, or choose 'Browse' to select the location. 
         Press 'OK' to close the dialog.

      e) Select the displayed model, and click 'Next' to start installation.

      f) The wizard will start to install the driver at this time. 

         Note: A window may appear that the chosen driver is not digitally signed, you will be 
               asked if you want to continue the installation. Click on the 'Yes' button to continue.

      g) After the installation has finished, click 'Finish' to close the wizard.
            
   6) The driver update is now complete and the smart card reader is ready for use.

   Note: The wizard might ask you to restart the computer in order to use the new driver. 
         Click 'Yes' to do so (make sure all applications are closed though and all documents 
         are saved). 


6.3. Driver Update (Windows Vista & Server 2008)
------------------------------------------------

   1) Unzip the package to an easy to find location (e.g. the desktop).

   2) Make sure the smart card reader is plugged into a USB port.

   3) Open the Device Manager as follows:
   
      a) Press 'Start' and rightclick on 'Computer', in the menu that opens, choose 'Manage'
   
         Note: If User Account Control is enabled, a dialog will appear asking for 
               permission. Press 'Continue' to continue...

      b) In the dialog that opens, choose 'Device Manager' in the menu on the left.

      c) In the treeview that opens, choose 'Smart card readers'.

      d) The smart card reader should be present here.

   4) Rightclick on the smart card reader and choose 'Update Driver Software'.

   5) The 'Update Driver Software Wizard' will appear, please follow the following steps:
         
      a) In the first screen, choose 'Browse my computer for driver software'.

      b) In the next screen, choose 'Let me pick from a list of device drivers on my computer'.
   
      c) In the next screen, press 'Have Disk...'. In the dialog box that opens, enter the location 
         of the driver package saved in step 1, or choose 'Browse' to select the location. 
         Press 'OK' to close the dialog.

      d) Select the displayed model, and click 'Next' to start installation.

      e) The wizard will start to install the driver at this time. 

         Note: A window may appear that the chosen driver is not digitally signed, you will be 
               asked if you want to continue the installation. 
               Click on the 'Yes' button to continue.

      f) After the installation has finished, choose 'Finish' to close the wizard.

   6) The driver update is now complete and the smart card reader is ready for use.

   Note: The wizard might ask you to restart the computer in order to use the new driver. 
         Click 'Yes' to do so (make sure all applications are closed though and all documents 
         are saved). 
         

6.4. Driver Update (Windows 7 & Windows 8 &  Windows 8.1   & Server 2008 R2 & Server 2012  &  Server 2012 R2)
-----------------------------------------------

   1) Unzip the package to an easy to find location (e.g. the desktop).

   2) Make sure the smart card reader is plugged into a USB port.

   3) Open the Device Manager as follows:
   
      a) Press 'Start' and rightclick on 'Computer', in the menu that opens, choose 'Manage'
   
         Note: If User Account Control is enabled, a dialog will appear asking for 
               permission. Press 'Continue' to continue...

      b) In the dialog that opens, choose 'Device Manager' in the menu on the left.

      c) In the treeview that opens, choose 'Smart card readers'.
    
         Note: If this is an 1st installation where the drivers could not be downloaded from 
               Windows Update, the reader is listed under 'Other devices'

      d) The smart card reader should be present here.

   4) Rightclick on the smart card reader and choose 'Update Driver Software'.

   5) The 'Update Driver Software Wizard' will appear, please follow the following steps:
         
      a) In the first screen, choose 'Browse my computer for driver software'.

      b) In the next screen, choose 'Let me pick from a list of device drivers on my computer'.
    
         Note: If a list of device types is shown in the next screen, choose 'Smart card readers' from the 
               list and click 'Next'.
   
      c) In the next screen, press 'Have Disk...'. In the dialog box that opens, enter the location 
         of the driver package saved in step 1, or choose 'Browse' to select the location. 
         Press 'OK' to close the dialog.

      d) Select the displayed model, and click 'Next' to start installation.

      e) The wizard will start to install the driver at this time. 

         Note: A window may appear that the chosen driver is not digitally signed or that the driver
               has been signed by ACS, you will be asked if you want to continue the installation. 
               Click on the 'Install' button to continue.

      f) After the installation has finished, choose 'Finish' to close the wizard.

   6) The driver update is now complete and the smart card reader is ready for use.

   Note: The wizard might ask you to restart the computer in order to use the new driver. 
         Click 'Yes' to do so (make sure all applications are closed though and all documents 
         are saved). 
         
7. Check Installation
---------------------

   In order to check if the drivers have been installed succesfully, please go to our website: 
   http://www.acs.com.hk and download the ACS Quickview tool from the 'Downloads' section as 
   follows:

   1) Go to http://www.acs.com.hk/card-utility-tools.php.
   
   2) Click the 'ACS Diagnostic Tool Quickview' link and download the zip-file to an easy to find 
      location (e.g. the desktop), then unzip the contents.

   3) Start 'QuickView.exe' to start the tool.

   4) In the program, press 'Initialize' to get a list of installed readers, 
      the just installed smart card reader should be listed in the list on the left in the program.
     
8. Driver Removal
-----------------

   1) Make sure the smart card reader is plugged into a USB port.
   
   2) Open the Device Manager (for instructions please follow any of the instructions above). 

   3) In the treeview in the Device Manager, choose 'Smart card readers'.

   4) The installed smart card reader should be present here.

   5) Rightclick on the smart card reader and choose 'Uninstall'.
   
   6) A dialog will open to confirm the device removal, click 'OK' to proceed.
   
      Note: Under Vista/Windows 7/Server 2008/Server 2008 R2, when shown, it is recommended 
            to check the 'Delete the driver software for this device' checkbox as well.
   
   7) The smart card reader driver has been uninstalled, the reader can be unplugged from the USB
      port.
      

9. Troubleshooting
------------------

   If the reader is not listed in the ACS QuickView tool, please follow the steps below to check 
   the installation of the smart card reader.

   1) Re-plugin the reader and see if the 'New Hardware Found' wizard is starting.
      If it does, please follow the instructions above.

   2) If the reader is still not listed in the QuickView program, please follow the following steps:

      - Open the Device Manager (for instructions please follow any of the instructions above). 

      - In the treeview in the Device Manager, choose 'Smart card readers'.

      - The just installed smart card reader should be present here.

      - If the smart card reader is present in the Device Manager, but it has an exclamation mark,
        please follow the instructions to update the driver as mentioned above.

   3) Check if the Smartcard Service is running as follows:
      
        Press 'Start', then 'Run', type 'services.msc'.
   
        Note: For Vista/Windows 7/Server 2008/server 2008 R2; if User Account Control is enabled,
              a dialog will appear asking for permission. Press 'Continue' to continue...
 
        In the dialog opens, find the 'Smart Card' entry in the list of services.
   
        The status should be 'Started' and the Startup Type should be 'Automatic'. If this is not 
        the case, please doubleclick on the entry to change the properties and start the service.

   4) Close all applications, reboot the PC with the reader plugged in.
   
   If the smart card reader is still not listed in the QuickView program after any of above steps,
   please save the log and contact ACS using the means mentioned below.


10. Support
----------

   In case of problems, please contact ACS through:

   website:    http://www.acs.com.hk/
   email:      info@acs.com.hk


-----------------------------

Copyright 
---------

   Copyright by Advanced Card Systems Ltd. (ACS) No part of this reference manual may be reproduced 
   or transmitted in any from without the expressed, written permission of ACS. 

Notice 
------
   Due to rapid change in technology, some of specifications mentioned in this publication are 
   subject to change without notice. Information furnished is believed to be accurate and reliable.
   ACS assumes no responsibility for any errors or omissions, which may appear in this document.

-----------------------------
Version      : 1.2 
Last modified: July 2014