# Slocky Omega Bootloader

Created by Luka Penger

## Configuration

Important URLs for 3G setup: 

```
http://wiki.villagetelco.org/Using_a_3G_USB_Modem
https://community.onion.io/topic/2908/lsusb-not-found/2
http://www.panticz.de/node/670
```

Default WiFi password: `12345678`, Terminal password: `onioneer`

### 1. SD Card external storage setup

https://docs.onion.io/omega2-docs/boot-from-external-storage.html

### 2. Omega upgrade to latest version

`oupgrade --latest`

### 4. Change host name

```
uci set system.@system[0].hostname=Slocky-ABCD
uci commit
```

### 5. Change access point name

```
uci set wireless.@wifi-iface[0].ssid=Slocky-ABCD
uci commit
```

### 6. Change access point password

```
uci set wireless.@wifi-iface[0].key=ABCDABCD
uci commit
```

### 7. Change root password

```
passwd
ABCDABCD
```

### 8. Install packages

```
opkg update
opkg install git
opkg install node
opkg install node-npm
```

### 9. Disable omega console and update uhttpd file

`vi /etc/config/uhttpd`

```
config cert 'defaults'
option days '730'
option bits '2048'
option country 'ZZ'
option state 'Somewhere'
option location 'Unknown'
option commonname 'OpenWrt'
```

### 10. Create `/root/bootloader` folder and copy `device_settings.json` to `/root`

### 11. Permission for start script file

`chmod +x /root/bootloader/start.sh`

### 12. Uncomment lines for opkg packages

`vi /etc/opkg/distfeeds.conf`

`opkg update`

### 13. Install 3G packages

```
opkg update
opkg install comgt
opkg install kmod-usb-serial
opkg install kmod-usb-serial-option
opkg install kmod-usb-serial-wwan
opkg install usb-modeswitch
opkg install luci-proto-3g
```

### 14. USB-modeswitch setup

Print usb devices for vendor: `cat /sys/kernel/debug/usb/devices`

Write line in: `vi /etc/modules.d/60-usb-serial`

```
usbserial vendor=0x12d1 product=0x1c05
```

### 15. Setup 3G.chat file

`vi /etc/chatscripts/3g.chat`

```
ABORT   BUSY
ABORT   'NO CARRIER'
ABORT   ERROR
REPORT  CONNECT
TIMEOUT 10
""      "AT+CSQ"
OK      "ATE1"
OK      'AT+CGDCONT=1,"IP","$USE_APN"'
SAY     "Calling UMTS/GPRS"
TIMEOUT 30
OK      "ATD*99***#"
CONNECT ' '
```

### 16. Auto script setup in rc.local

`vi /etc/rc.local`

```
#!/bin/sh -e

exec 2> /root/rc.local.log  # send stderr from rc.local to a log file
exec 1>&2                      # send stdout to the same log file
set -x

ifdown 3g
ifup 3g
/etc/init.d/network restart

(cd /root/bootloader; sh start.sh;)

exit 0
```

### 17. Network setup

`vi /etc/config/network`

```
config interface 'loopback'
	option ifname 'lo'
	option proto 'static'
	option ipaddr '127.0.0.1'
	option netmask '255.0.0.0'

config globals 'globals'
	option ula_prefix 'fd1d:48c4:7633::/48'

config interface 'wlan'
	option type 'bridge'
	option proto 'static'
	option ipaddr '192.168.3.1'
	option netmask '255.255.255.0'
	option ip6assign '60'

config interface '3g'
	option ifname 'ppp0'
	option password 'internet'
	option service 'umts'
	option proto '3g'
	option apn 'internet'
	option username 'mobitel'
	option pincode ''
	option device '/dev/ttyUSB0'

config interface 'wwan'
	option ifname 'apcli0'
	option proto 'dhcp'
	option hostname 'Slocky-ABCD'
```
