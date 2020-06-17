const fs = require('fs-extra');
const request = require('request');
const http = require('http');
const https = require('https');
const { exec, execSync } = require('child_process');
const URL = require('url');
const crypto = require('crypto');
const path = require('path');

const SharedManager = require('./app/shared_manager.js');

require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l Z' });

/*
 * Constants
 */

const ProcessFilePath = './process.json';

/*
 * Variables
 */

var timer;
var firmwareChecking = false;

/*
 * Write process file
 */

const processJson = JSON.stringify({
	pid: process.pid
});  
fs.writeFileSync(ProcessFilePath, processJson);

/*
 * Methods
 */

function deleteFolderRecursive(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function(file, index) {
			var curPath = path + "/" + file;

			if(fs.lstatSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
	    });

    	fs.rmdirSync(path);
	}
};

function getDirectories(path) {
	return fs.readdirSync(path).filter(function(file) {
		return fs.statSync(path + '/' + file).isDirectory();
	});
};

/*
 * Methods for bootloader
 */

function startBootloaderApplication() {
	execSync('reboot');
};

function renameNewBootloaderFolder() {
	function renameFolder() {
		fs.readdir(SharedManager.newBootloaderFolderPath, (error, files) => {
			if (error == null && files.length > 0) {
				deleteFolderRecursive(SharedManager.bootloaderFolderPath);
				
				fs.rename(SharedManager.newBootloaderFolderPath, SharedManager.bootloaderFolderPath, function(error) {
					startBootloaderApplication();
				});
			} else {
				deleteFolderRecursive(SharedManager.newBootloaderFolderPath);
				
				execSync('reboot');
			}
		});
	};
	
	renameFolder();
};

function convertBootloaderBinToZip() {
	function convertBinToZip() {
		function convertingBinError() {
			if (fs.existsSync(SharedManager.bootloaderBinFilePath)) {
				fs.unlinkSync(SharedManager.bootloaderBinFilePath);
			}
			
			if (fs.existsSync(SharedManager.bootloaderZipFilePath)) {
				fs.unlinkSync(SharedManager.bootloaderZipFilePath);
			}
			
			execSync('reboot');
		};
		
		fs.readFile(SharedManager.bootloaderBinFilePath, function read(error, data) {
			if (error != null) {
				console.error('Bootloader BIN read file error: ' + stderr);
				
				convertingBinError();
			} else {
				var decipher = crypto.createDecipher('aes-256-cbc', SharedManager.bootloaderSettings.crypto_key, SharedManager.bootloaderSettings.crypto_iv);
				decipher.setAutoPadding(false);
				
				var decrypted = Buffer.concat([decipher.update(data, 'binary'), decipher.final()]);
				
				fs.writeFile(SharedManager.bootloaderZipFilePath, decrypted, function(error) {
					if (error != null) {
						console.error('Bootloader BIN converting to ZIP error: ' + stderr);
						
						convertingBinError()
					} else {
						console.log('Bootloader BIN converting to ZIP finished');
						
						if (fs.existsSync(SharedManager.bootloaderBinFilePath)) {
							fs.unlinkSync(SharedManager.bootloaderBinFilePath);
						}
						
						unzipBootloaderFile();
					}
				});
			}
		});
	};
	
	convertBinToZip();
};

function installNewBootloaderLibraries() {
	if (fs.existsSync(SharedManager.newBootloaderFolderPath + '/node_modules')) {
		renameNewBootloaderFolder();
	} else {
		console.log('New bootloader installing libraries.');
		
		function installLibraries() {
			try {
				execSync('sh install.sh', { cwd: SharedManager.newBootloaderFolderPath });
				
				renameNewBootloaderFolder();
			} catch (error) {
				if (fs.existsSync(SharedManager.newBootloaderFolderPath)) {
					fs.unlinkSync(SharedManager.newBootloaderFolderPath);
				}
				
				if (fs.existsSync(SharedManager.bootloaderBinFilePath)) {
					fs.unlinkSync(SharedManager.bootloaderBinFilePath);
				}
				
				if (fs.existsSync(SharedManager.bootloaderZipFilePath)) {
					fs.unlinkSync(SharedManager.bootloaderZipFilePath);
				}
				
				execSync('reboot');
			}
		};
		
		installLibraries();
	}
};

function unzipBootloaderFile() {
	function unzipFile() {
		if (!fs.existsSync(SharedManager.newBootloaderFolderPath)) {
		    fs.mkdirSync(SharedManager.newBootloaderFolderPath);
		}
		
		exec("unzip '" + SharedManager.bootloaderZipFilePath + "' -d '" + SharedManager.newBootloaderFolderPath + "'", (error, stdout, stderr) => {
			if (fs.existsSync(SharedManager.bootloaderZipFilePath)) {
				fs.unlinkSync(SharedManager.bootloaderZipFilePath);
			}
				
			if (error != null) {
				console.error('Bootloader ZIP extract error: ' + stderr);
				
				deleteFolderRecursive(SharedManager.newBootloaderFolderPath);
				
				execSync('reboot');
			} else {
				console.log('Bootloader ZIP file extract finished.');
				
				installNewBootloaderLibraries()
			}
		});
	};
	
	unzipFile();
};

/*
 * Methods for firmware
 */
 
function startFirmwareApplication() {
	console.log('Firmware application starting.');
	
	execSync('sh start.sh', { cwd: SharedManager.firmwareFolderPath });
};

function renameNewFirmwareFolder() {
	function renameFolder() {
		fs.readdir(SharedManager.newFirmwareFolderPath, (error, files) => {
			if (error == null && files.length > 0) {
				deleteFolderRecursive(SharedManager.firmwareFolderPath);
				
				fs.rename(SharedManager.newFirmwareFolderPath, SharedManager.firmwareFolderPath, function(error) {
					startFirmwareApplication();
				});
			} else {
				deleteFolderRecursive(SharedManager.newFirmwareFolderPath);
				
				execSync('reboot');
			}
		});
	};
	
	renameFolder();
};

function convertFirmwareBinToZip() {
	function convertBinToZip() {
		function convertingBinError() {
			if (fs.existsSync(SharedManager.firmwareBinFilePath)) {
				fs.unlinkSync(SharedManager.firmwareBinFilePath);
			}
			
			if (fs.existsSync(SharedManager.firmwareZipFilePath)) {
				fs.unlinkSync(SharedManager.firmwareZipFilePath);
			}
			
			execSync('reboot');
		};
		
		fs.readFile(SharedManager.firmwareBinFilePath, function read(error, data) {
			if (error != null) {
				console.error('Firmware BIN read file error: ' + stderr);
				
				convertingBinError();
			} else {
				var decipher = crypto.createDecipher('aes-256-cbc', SharedManager.bootloaderSettings.crypto_key, SharedManager.bootloaderSettings.crypto_iv);
				decipher.setAutoPadding(false);
				
				var decrypted = Buffer.concat([decipher.update(data, 'binary'), decipher.final()]);
				
				fs.writeFile(SharedManager.firmwareZipFilePath, decrypted, function(error) {
					if (error != null) {
						console.error('Firmware BIN converting to ZIP error: ' + stderr);
						
						convertingBinError()
					} else {
						console.log('Firmware BIN converting to ZIP finished');
						
						if (fs.existsSync(SharedManager.firmwareBinFilePath)) {
							fs.unlinkSync(SharedManager.firmwareBinFilePath);
						}
			
						unzipFirmwareFile();
					}
				});
			}
		});
	};
	
	convertBinToZip();
};

function installFirmwareLibraries() {
	if (fs.existsSync(SharedManager.firmwareFolderPath + '/node_modules')) {
		startFirmwareApplication();
	} else {
		console.log('Firmware installing libraries.');
		
		function installLibraries() {
			execSync('sh install.sh', { cwd: SharedManager.firmwareFolderPath });
			
			startFirmwareApplication();
		};
		
		installLibraries();
	}
};

function installNewFirmwareLibraries() {
	if (fs.existsSync(SharedManager.newFirmwareFolderPath + '/node_modules')) {
		renameNewFirmwareFolder();
	} else {
		console.log('New firmware installing libraries.');
		
		function installLibraries() {
			try {
				execSync('sh install.sh', { cwd: SharedManager.newFirmwareFolderPath });
				
				if (SharedManager.deviceSettings.services != null) {
					SharedManager.deviceSettings.services.forEach(function(service) {
						if (!fs.existsSync(SharedManager.servicesFolderPath + '/' + service.service_folder + '/node_modules')){
							if (fs.existsSync(SharedManager.servicesFolderPath + '/' + service.service_folder + '/install.sh')) {
								console.log("Installing libraries for service: " + service.service_name);
								
								execSync('sh install.sh', { cwd: SharedManager.servicesFolderPath + '/' + service.service_folder });
							} else {
								console.log("Install script not found for service: " + service.service_name);
							}
						} else {
							console.log("Libraries already installed for service: " + service.service_name);
						}
					});
				}
						
				renameNewFirmwareFolder();
			} catch (error) {
				if (fs.existsSync(SharedManager.newFirmwareFolderPath)) {
					fs.unlinkSync(SharedManager.newFirmwareFolderPath);
				}
				
				if (fs.existsSync(SharedManager.firmwareBinFilePath)) {
					fs.unlinkSync(SharedManager.firmwareBinFilePath);
				}
				
				if (fs.existsSync(SharedManager.firmwareZipFilePath)) {
					fs.unlinkSync(SharedManager.firmwareZipFilePath);
				}
				
				execSync('reboot');
			}
		};
		
		installLibraries();
	}
};

function unzipFirmwareFile() {
	function unzipFile() {
		if (!fs.existsSync(SharedManager.newFirmwareFolderPath)) {
		    fs.mkdirSync(SharedManager.newFirmwareFolderPath);
		}
		
		exec("unzip '" + SharedManager.firmwareZipFilePath + "' -d '" + SharedManager.newFirmwareFolderPath + "'", (error, stdout, stderr) => {
			if (fs.existsSync(SharedManager.firmwareZipFilePath)) {
				fs.unlinkSync(SharedManager.firmwareZipFilePath);
			}
				
			if (error != null) {
				console.error('Firmware ZIP extract error: ' + stderr);
				
				deleteFolderRecursive(SharedManager.newFirmwareFolderPath);
				
				execSync('reboot');
			} else {
				console.log('Firmware ZIP file extract finished.');
				
				if (fs.existsSync(SharedManager.newFirmwareServicesFolderPath)) {
					const folders = getDirectories(SharedManager.newFirmwareServicesFolderPath);
					
					// Copy services folder to root
					
					if (SharedManager.deviceSettings.services != null) {
						SharedManager.deviceSettings.services.forEach(function(service) {
							folders.forEach(function(folder) {
								if (service.service_type == folder) {
									fs.copySync(SharedManager.newFirmwareServicesFolderPath + '/' + folder, SharedManager.servicesFolderPath + '/' + service.service_folder, { overwrite: true });
								}
							});
						});
					}
					
					deleteFolderRecursive(SharedManager.newFirmwareServicesFolderPath);
				}
				
				
				installNewFirmwareLibraries();
			}
		});
	};
	
	unzipFile();
};

function checkForFirmwareOnServer() {
	if (firmwareChecking == true) {
		return;
	}
	
	firmwareChecking = true;
	
	function downloadFirmware(deviceFirmware) {
		console.log("Firmware " + deviceFirmware.firmware_version + " downloading");
		
		function startDownloadFile(fileUrl) {
			function downloadFile() {
				var lcdPrint = false;
				
				var file = fs.createWriteStream(SharedManager.firmwareBinFilePath);
			
				var request = https.get(deviceFirmware.file_url, function(response) {
					var contentLength = response.headers['content-length'];
					var downloadedLength = 0;
				  	
				  	response.on('data', function(chunk) {
		                file.write(chunk);
		                
		                downloadedLength += chunk.length;
		            }).on('end', function () {	                
		                file.end();
		                
		                console.log('Firmware download finished');
		                
		                clearInterval(timer);
		                
		                firmwareChecking = false;
		                
		                convertFirmwareBinToZip();
		            }).on('error', function (err) {
		                console.log('Firmware downloading error');
		                
		                firmwareChecking = false;
		            });
				});
			};
			
			downloadFile();
		};
		
		startDownloadFile(deviceFirmware.file_url);
	};
	
	function loadRequest() {
		const options = {
		    url: SharedManager.deviceSettings.api_server_url + '/device_firmwares',
		    method: 'GET',
		    qs: {
		        filter: JSON.stringify({
					hardware: SharedManager.deviceSettings.hardware,
					hardware_version: SharedManager.deviceSettings.hardware_version,
					services: SharedManager.deviceSettings.services
				}),
				limit: 1,
				sort: '-firmware_version'
		    }
		};
		
		request(options, function(error, response, body) {
			if (error != null) {
				console.error(error);
				
				firmwareChecking = false;
			} else {
				try {
					const array = JSON.parse(body);
					
					if (array != null && array.length > 0) {
						const deviceFirmware = array[0];
						
						downloadFirmware(deviceFirmware);
					} else {
						console.error("No firmware available");
						
						firmwareChecking = false;
					}
				} catch (error) {
					console.error("JSON parsing error: " + error);
					
					firmwareChecking = false;
				}
			}
		});
	};
	
	function checkInternetConnection() {
		SharedManager.checkInternetConnection(function(error) {
			if (error == null) {
				loadRequest();
			} else {
				console.log(error);
				
				firmwareChecking = false;
			}
		});
	};
	
	checkInternetConnection();
};

function start() {
	if (fs.existsSync(SharedManager.bootloaderBinFilePath)) {
		convertBootloaderBinToZip();
	} else if (fs.existsSync(SharedManager.bootloaderZipFilePath)) {
		unzipBootloaderFile();
	} else if (fs.existsSync(SharedManager.newBootloaderFolderPath)) {
		installNewBootloaderLibraries();
	} else if (fs.existsSync(SharedManager.firmwareBinFilePath)) {
		convertFirmwareBinToZip();
	} else if (fs.existsSync(SharedManager.firmwareZipFilePath)) {
		unzipFirmwareFile();
	} else if (fs.existsSync(SharedManager.newFirmwareFolderPath)) {
		installNewFirmwareLibraries();
	} else if (fs.existsSync(SharedManager.firmwareFolderPath)) {
		installFirmwareLibraries();
	} else {
		checkForFirmwareOnServer();
		
		timer = setInterval(function() {
			checkForFirmwareOnServer();
		}, SharedManager.bootloaderSettings.check_firmware_on_server_interval);
	}
};

/* 
 * Init
 */

SharedManager.readDeviceSettings();

SharedManager.readBootloaderSettings();

SharedManager.readFirmwareSettings();

start()