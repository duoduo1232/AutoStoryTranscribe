@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ==============================================
REM AutoStoryTranscribe 更新脚本
REM 作用：从 GitHub 下载最新代码，但跳过 process 文件夹的覆盖
REM 使用方法：将本脚本放在仓库根目录下运行
REM ==============================================

REM 配置项
set "REPO_URL=https://github.com/duoduo1232/AutoStoryTranscribe/archive/refs/heads/main.zip"
set "BRANCH=main"
set "TARGET_DIR=%CD%"
set "TEMP_DIR=%TEMP%\autotranscribe_update"
set "ZIP_FILE=%TEMP%\autotranscribe.zip"
set "EXCLUDE_FOLDER=process"

echo 正在从 GitHub 下载最新代码...
powershell -Command "& {Invoke-WebRequest -Uri '%REPO_URL%' -OutFile '%ZIP_FILE%'}"

if not exist "%ZIP_FILE%" (
    echo 下载失败，请检查网络连接或仓库地址。
    pause
    exit /b 1
)

echo 下载完成，正在解压...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

powershell -Command "& {Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%TEMP_DIR%' -Force}"

REM 查找解压后的实际文件夹（通常为 AutoStoryTranscribe-main）
set "EXTRACTED_DIR="
for /d %%i in ("%TEMP_DIR%\*") do (
    set "EXTRACTED_DIR=%%i"
    goto :found
)
:found
if not defined EXTRACTED_DIR (
    echo 解压失败，未找到解压后的文件夹。
    pause
    exit /b 1
)

echo 正在更新文件（跳过 %EXCLUDE_FOLDER% 文件夹）...

REM 使用 robocopy 复制文件，排除指定文件夹
REM 注意：/XD 参数必须紧跟排除的文件夹名，不能有空格干扰
robocopy "%EXTRACTED_DIR%" "%TARGET_DIR%" /E /XD "%EXCLUDE_FOLDER%" /IS /IT

REM 检查 robocopy 返回码
if errorlevel 8 (
    echo 复制过程中可能发生错误，请检查权限或磁盘空间。
) else (
    echo 更新完成！本地 process 文件夹未受影响。
)

REM 清理临时文件
echo 清理临时文件...
del /f /q "%ZIP_FILE%" 2>nul
rmdir /s /q "%TEMP_DIR%" 2>nul

pause