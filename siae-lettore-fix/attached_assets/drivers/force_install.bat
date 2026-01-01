@echo off
%~d0
cd "%~p0"
if EXIST dpinst.exe set DPINST=dpinst.exe
if EXIST dpinst21.exe set DPINST=dpinst21.exe
if EXIST dpinst64.exe set DPINST=dpinst64.exe
if EXIST dpinst6421.exe set DPINST=dpinst6421.exe
start %DPINST% /F /SA
