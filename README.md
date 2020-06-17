# Slocky Raspberry đuration

Created by Luka Penger

### 1. Write raspbian image to sd card:

Image: `Raspbian Buster Lite`
SD Card format: `ExFat`

`sudo dd bs=1m if=image.img of=/dev/disk2 conv=sync`

### 2. Insert SD card to Raspberry and wait for installation.

### 3. Remove SD card and insert SD card to computer:

1. Create new empty file called `ssh`. This is for SSH enable.

2. Edit config.txt file:

```
dtparam=spi=on
dtoverlay=mcp2515-can0,oscillator=8000000,interrupt=25
dtoverlay=spi-bcm2835-overlay
enable_uart=1
dtoverlay=w1-gpio,gpiopin=24

#arm_freq=800
#core_freq=250
```

3. Edit cmdline.txt file:

Remove `console=serial0,115200` from file. This is for disable console on uart0.

### 4. Insert SD card to Raspberry.

### 5. Connect Raspberry to ethernet first.

### 6. Connect to SSH with terminal:

`ssh pi@192.168.1.8`

Username: `pi`
Password: `raspberry`

### 7. Change password for pi user:

`passwd`

### 8. Setup password for root user:

`sudo passwd root`

If device alias is Slocky-XXXX, then set passwords like:
- root/pi password to slockyXXXXXXXX
- wifi password to XXXXXXXX

### 9. Enable root for SFTP:

`sudo nano /etc/ssh/sshd_config`

Search for PermitRootLogin and change it to yes.

### 10. Go to root user:

`su`

### 11. Edit some settings for raspi:

`raspi-config`

1. Change host name: `Slocky-XXXX`

2. Change wifi country.

3. Enable SSH.

4. Enable I2C.

5. Enable serial (disable serial console).

6. Update raspi-config.

### 12. Install GIT:

`sudo apt-get -y install git`

### 13. Install Node:

```
wget https://nodejs.org/dist/v8.9.0/node-v8.9.0-linux-armv6l.tar.gz
tar -xzf node-v8.9.0-linux-armv6l.tar.gz
cd node-v8.9.0-linux-armv6l
sudo cp -R * /usr/local/
```

Check if node version is OK:

```
node -v
npm -v
```

### 14. Install remot3.it:

Email: infoslocky@gmail.com
Password: YgLzUq7rsj8GVLV

```
sudo apt update
sudo apt install connectd
sudo connectd_installer
```

Device name like: Slocky-XXXX

Install SSH, HTTP, HTTPS service.

### 15. Installation for sixfab LTE modem:

```
wget https://raw.githubusercontent.com/sixfab/Sixfab_PPP_Installer/master/ppp_installer/install.sh
chmod +x install.sh
sudo ./install.sh
```

Communication port is `ttyUSB3`

1. Select 3G, 4G/LTE Base Shield.

2. Type APN: `internet`

3. Type username: `mobitel`

4. Type password: `internet`

5. Edit file `sudo nano /etc/chatscripts/chat-connect`:

```
ABORT "BUSY"
ABORT "NO CARRIER"
ABORT "NO DIALTONE"
ABORT "ERROR"
ABORT "NO ANSWER"
ABORT "DELAYED"
REPORT CONNECT
TIMEOUT 30
"" AT
OK ATE0
OK ATI;+CSUB;+CSQ;+COPS?;+CGREG?;&D2
OK @/etc/chatscripts/apn
OK @/etc/chatscripts/dial
CONNECT
```

5. Create file `sudo nano /etc/chatscripts/apn`:

```
AT+CGDCONT=1,"IP","internet"
```

6. Create file `sudo nano /etc/chatscripts/dial`:

```
ATD*99#
```

7. Edit file `sudo nano /etc/ppp/peers/provider`:

```
# /etc/ppp/peers/provider
/dev/serial/by-id/usb-Android_Android-if03-port0 115200
# The chat script, customize your APN in this file
connect 'chat -s -v -f /etc/chatscripts/chat-connect'
# The close script
disconnect 'chat -s -v -f /etc/chatscripts/chat-disconnect'
# Hide password in debug messages
hide-password
# Debug info from pppd
debug
# If you want to use the HSDPA link as your gateway
defaultroute
# pppd must not propose any IP address to the peer
noipdefault
# No ppp compression
novj
novjccomp
noccp
ipcp-accept-local
ipcp-accept-remote
local
# For sanity, keep a lock on the serial line
lock
modem
dump
updetach
# Hardware flow control
nocrtscts
remotename 3gppp
ipparam 3gppp
ipcp-max-failure 30
# Ask the peer for up to 2 DNS server addresses
usepeerdns

#START
noauth
#END
```

### 16. Find USB ports for serial devices and LTE modem:

`ls /dev/serial/by-id`

### 17. Setup access point Wi-Fi:

```
sudo apt install dnsmasq hostapd
sudo systemctl stop dnsmasq
sudo systemctl stop hostapd
```

1. Edit file `sudo nano /etc/dhcpcd.conf`:

Add to bottom

```
#ETH0_START
#interface eth0
#static ip_address=192.168.1.100/24
#static routers=192.168.1.1
#static domain_name_servers=192.168.1.1
#nohook wpa_supplicant
#ETH0_END

#WLAN0_START
interface wlan0
static ip_address=192.168.2.100/24
nohook wpa_supplicant
#WLAN0_END
```

2. Restart dhcpd `sudo service dhcpcd restart`.

3. Config dhcp server:

```
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig
sudo nano /etc/dnsmasq.conf
```

Type in file:

```
#WLAN0_START
interface=wlan0
dhcp-range=192.168.2.1,192.168.2.50,255.255.255.0,24h
#WLAN0_END

#ETH0_START
interface=eth0
dhcp-range=192.168.1.1,192.168.1.50,255.255.255.0,24h
#ETH0_END
```

4. Reload dnsmasq:

```
sudo systemctl start dnsmasq
sudo systemctl reload dnsmasq
```

5. Access point settings:

`sudo nano /etc/hostapd/hostapd.conf`

```
interface=wlan0
driver=nl80211
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
ignore_broadcast_ssid=0

#START
ssid=Slocky-2539
wpa_passphrase=25392539
#END
```

6. We now need to tell the system where to find this configuration file.

`sudo nano /etc/default/hostapd`

```
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

7. Startup:

```
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl start hostapd
```

8. Check status:

```
sudo systemctl status hostapd
sudo systemctl status dnsmasq
```

9. Setup ip forward:

`sudo nano /etc/sysctl.conf`

```
net.ipv4.ip_forward=1
```

10. Masquerade for outbound traffic from ppp0, eth0, wlan0 to wlan0:

```
sudo iptables -t nat -A POSTROUTING -o ppp0 -j MASQUERADE
sudo iptables -A FORWARD -i ppp0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i wlan0 -o ppp0 -j ACCEPT

sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT

sudo iptables -t nat -A POSTROUTING -o ppp0 -j MASQUERADE
sudo iptables -A FORWARD -i ppp0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o ppp0 -j ACCEPT
```

11. Save the iptables rule:

`sudo sh -c "iptables-save > /etc/iptables.ipv4.nat"`

12. Do not forget to add line to /etc/rc.local:

`iptables-restore < /etc/iptables.ipv4.nat`

13. Edit file `sudo nano /etc/network/interfaces`:

Add to bottom

```
auto tunnel
	iface tunnel inet ppp
	
auto can0
iface can0 can static
        bitrate 250000
```

### 18. Install CPU monitoring:

```
cd /root
git clone https://github.com/davidsblog/rCPU
cd rCPU/rCPU/
make
```

### 17. Install can:

`sudo apt-get install can-utils`

`sudo ip link set can0 up type can bitrate 250000`

### 18. Auto script setup in rc.local:

`chmod +x /etc/rc.local`
`sudo nano /etc/rc.local`

```
#!/bin/sh -e

# Network

iptables-restore < /etc/iptables.ipv4.nat

# Software

exec 2> /root/rc.local.log  # send stderr from rc.local to a log file
exec 1>&2                      # send stdout to the same log file
set -x

(cd /root/bootloader; sudo sh start.sh;)

(cd /root/rCPU/rCPU; sudo ./rcpu 81 &)

exit 0
```

### 19. Add bower root command:

Create file '/root/.bowerrc':

```
{ "allow_root": true }
```

### GPIO LED PINOUT

LED 1: 18

LED 2: 23

LED 3: 22

LED 4: 27
