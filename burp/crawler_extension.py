##
# PhantomJS RIA crawler BurpSuite Extension
# Nikolay Matyunin <matyunin.n[at]gmail.com>
#
# Place the crawler scripts in the burpsuite/lib/ folder.
# Load extension in the Extender tab.
#
# Tested in Burpsuite Pro v1.5.01
# https://github.com/riacrawler/RiaCrawler
##

# Burp API imports
from burp import IBurpExtender, IMessageEditorTabFactory, IMessageEditorTab
from burp import IContextMenuFactory, IContextMenuInvocation, IParameter, IHttpListener
from burp import IBurpExtenderCallbacks, ITab, IRequestInfo

# Java UI imports
from javax.swing import JPanel, JToggleButton, JTextField, JTextArea, SwingConstants, JFrame
from javax.swing import JLabel, GroupLayout, JMenuItem, BorderFactory, JSeparator
from javax.swing import JList, DefaultListModel, DefaultComboBoxModel, ListSelectionModel, JScrollPane
from javax.swing import JComboBox
from javax.swing import JButton, JFileChooser
from javax.swing import JTable
from javax.swing.table import DefaultTableModel

from java.awt import Component, GridLayout, BorderLayout, Font, Color, Dimension
from javax.swing.event import DocumentListener,  ChangeListener
from java.awt.event import ActionListener

from javax.swing import Timer

# Java Lib imports
from java.util import List, ArrayList
from java.net import URL
from java.io import PrintWriter

# Python Lib imports
import os
import subprocess
import sys
from subprocess import Popen
import urllib2
import json


class BurpExtender(IBurpExtender, ITab, IContextMenuFactory, DocumentListener, ChangeListener):

    #
    # implement IBurpExtender
    #
    def	registerExtenderCallbacks(self, callbacks):
        print "PhantomJS RIA Crawler extension"
        print "Nikolay Matyunin @autorak <matyunin.n@gmail.com>"

        # keep a reference to our callbacks object and helpers object
        self._callbacks = callbacks
        self._helpers = callbacks.getHelpers()

        # extension name
        callbacks.setExtensionName("Phantom RIA Crawler")

        # Create Tab UI components
        self._jPanel = JPanel()
        self._jPanel.setBorder(BorderFactory.createEmptyBorder(5,5,5,5));

        _titleLabel = JLabel("Phantom RIA Crawler", SwingConstants.LEFT)
        _titleLabelFont = _titleLabel.font
        _titleLabelFont = _titleLabelFont.deriveFont(Font.BOLD, 12);
        _titleLabel.setFont(_titleLabelFont);
        _titleLabel.setForeground(Color(230, 142, 11))

        self._addressTextField = JTextField('')
        self._addressTextField.setColumns(50)
        _addressTextLabel = JLabel("Target URL:", SwingConstants.RIGHT)
        self._addressTextField.getDocument().addDocumentListener(self)

        self._phantomJsPathField = JTextField('phantomjs') # TODO: set permanent config value
        self._phantomJsPathField.setColumns(50)
        _phantomJsPathLabel = JLabel("PhantomJS path:", SwingConstants.RIGHT)

        self._startButton = JToggleButton('Start', actionPerformed=self.startToggled)
        self._startButton.setEnabled(False)

        _requestsMadeLabel = JLabel("DEPs found:", SwingConstants.RIGHT)
        self._requestsMadeInfo = JLabel("", SwingConstants.LEFT)
        _statesFoundLabel = JLabel("States found:", SwingConstants.RIGHT)
        self._statesFoundInfo = JLabel("", SwingConstants.LEFT)

        _separator = JSeparator(SwingConstants.HORIZONTAL)

        _configLabel = JLabel("Crawling configuration:")
        self._configButton = JButton("Load config", actionPerformed=self.loadConfigClicked)
        self._configFile = ""

        _listenersLabel= JLabel("Burp proxy listener:", SwingConstants.RIGHT)
        self._listenersCombo = JComboBox()
        self._configTimer = Timer(5000, None)
        self._configTimer.actionPerformed = self._configUpdated
        self._configTimer.stop()
        self._configUpdated(None)

        self._commandClient = CommandClient(self)

        # Layout management
        self._groupLayout = GroupLayout(self._jPanel)
        self._jPanel.setLayout(self._groupLayout)
        self._groupLayout.setAutoCreateGaps(True)
        self._groupLayout.setAutoCreateContainerGaps(True)

        self._groupLayout.setHorizontalGroup(self._groupLayout.createParallelGroup()
            .addComponent(_titleLabel)
            .addGroup(self._groupLayout.createSequentialGroup()
                .addComponent(_addressTextLabel)
                .addGroup(self._groupLayout.createParallelGroup()
                    .addComponent(self._addressTextField, GroupLayout.PREFERRED_SIZE, GroupLayout.PREFERRED_SIZE, GroupLayout.PREFERRED_SIZE)
                    .addGroup(self._groupLayout.createSequentialGroup()
                        .addComponent(_requestsMadeLabel)
                        .addComponent(self._requestsMadeInfo))
                    .addGroup(self._groupLayout.createSequentialGroup()
                        .addComponent(_statesFoundLabel)
                        .addComponent(self._statesFoundInfo)))
                .addComponent(self._startButton))
            .addComponent(_separator)
            .addGroup(self._groupLayout.createSequentialGroup()
                .addComponent(_configLabel)
                .addComponent(self._configButton))
            .addGroup(self._groupLayout.createSequentialGroup()
                .addComponent(_phantomJsPathLabel)
                .addComponent(self._phantomJsPathField, GroupLayout.PREFERRED_SIZE, GroupLayout.PREFERRED_SIZE, GroupLayout.PREFERRED_SIZE))
            .addGroup(self._groupLayout.createSequentialGroup()
                .addComponent(_listenersLabel)
                .addComponent(self._listenersCombo, GroupLayout.PREFERRED_SIZE, GroupLayout.PREFERRED_SIZE, GroupLayout.PREFERRED_SIZE))
        )

        self._groupLayout.setVerticalGroup(self._groupLayout.createSequentialGroup()
            .addComponent(_titleLabel)
            .addGroup(self._groupLayout.createParallelGroup(GroupLayout.Alignment.BASELINE)
                .addComponent(_addressTextLabel)
                .addComponent(self._addressTextField)
                .addComponent(self._startButton))
            .addGroup(self._groupLayout.createParallelGroup(GroupLayout.Alignment.BASELINE)
                .addComponent(_requestsMadeLabel)
                .addComponent(self._requestsMadeInfo))
            .addGroup(self._groupLayout.createParallelGroup(GroupLayout.Alignment.BASELINE)
                .addComponent(_statesFoundLabel)
                .addComponent(self._statesFoundInfo))
            .addComponent(_separator, GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE, GroupLayout.PREFERRED_SIZE)
            .addGroup(self._groupLayout.createParallelGroup(GroupLayout.Alignment.BASELINE)
                .addComponent(_configLabel)
                .addComponent(self._configButton))
            .addGroup(self._groupLayout.createParallelGroup(GroupLayout.Alignment.BASELINE)
                .addComponent(_phantomJsPathLabel)
                .addComponent(self._phantomJsPathField))
            .addGroup(self._groupLayout.createParallelGroup(GroupLayout.Alignment.BASELINE)
                .addComponent(_listenersLabel)
                .addComponent(self._listenersCombo))
        )

        self._groupLayout.linkSize(SwingConstants.HORIZONTAL, _configLabel, _phantomJsPathLabel);
        self._groupLayout.linkSize(SwingConstants.HORIZONTAL, _configLabel, _listenersLabel);
        self._groupLayout.linkSize(SwingConstants.HORIZONTAL, _statesFoundLabel, _requestsMadeLabel);


        # context menu data
        self._contextMenuData = None;
        self._running = False;

        # register callbacks
        callbacks.customizeUiComponent(self._jPanel)
        callbacks.registerContextMenuFactory(self)
        callbacks.addSuiteTab(self)

        return

    #
    # implement ITab and Tab ChangeListener
    #
    def getTabCaption(self):
        return "Phantom RIA Crawler"
    def getUiComponent(self):
        return self._jPanel
    def stateChanged(self, ev):
        self._configUpdated()

    def _configUpdated(self, ev):
        config = self._callbacks.saveConfig()

        # update proxy listeners
        index = 0
        listeners = DefaultComboBoxModel()
        while (("proxy.listener" + str(index)) in config):
            listenerItem = config["proxy.listener" + str(index)]
            listenerItems = listenerItem.split(".")
            if (listenerItems[0] == "1"):
                address = ".".join(listenerItems[2][1:].split("|"))
                if (len(address) == 0):
                    address = "127.0.0.1"
                listeners.addElement(address + " : " + listenerItems[1])

            index = index + 1
        self._listenersCombo.setModel(listeners)
        return;

    #
    # implement button actions
    #
    def startToggled(self, ev):
        if (self._startButton.getModel().isSelected()):
            try:
                os.chdir(sys.path[0] + os.sep + "riacrawler" + os.sep + "scripts")
            except Exception as e:
                print >> sys.stderr, "RIA crawler scripts loading error", "I/O error({0}): {1}".format(e.errno, e.strerror)
                self._startButton.setSelected(False)
                return

            phantomJsPath = self._phantomJsPathField.text
            target = self._addressTextField.text

            config = "crawler.config"
            if (self._configFile):
                config = self._configFile

            listenerAddress = self._listenersCombo.getSelectedItem().replace(" ", "")
            p = Popen("{0} --proxy={3} main.js --target={1} --config={2}".format(phantomJsPath, target, config, listenerAddress), shell=True)
            self._running = True
            self._requestsMadeInfo.setText("")
            self._statesFoundInfo.setText("")
            self._commandClient.startCrawling()
        else:
            if (self._running):
                self._commandClient.stopCrawling()
            self._running = False

    def syncCrawlingState(self, result):
        print "RIA crawling state: ", result
        self._requestsMadeInfo.setText(str(result["requests_made"]))
        self._statesFoundInfo.setText(str(result["states_detected"]))
        if (result["running"] == False):
            self._commandClient.stopCrawling()
            self._running = False
            self._startButton.setSelected(False)

    def loadConfigClicked(self, ev):
        openFile = JFileChooser();
        openFile.showOpenDialog(None);
        self._configFile = openFile.getSelectedFile()

    #
    # implement DocumentListener for _addressTextField
    #
    def removeUpdate(self, ev):
        self.updateStartButton()
    def insertUpdate(self, ev):
        self.updateStartButton()
    def updateStartButton(self):
        self._startButton.setEnabled(len(self._addressTextField.text) > 0)


    #
    # implement IContextMenuFactory
    #
    def createMenuItems(self, contextMenuInvocation):
        menuItemList = ArrayList()

        context = contextMenuInvocation.getInvocationContext()
        if (context == IContextMenuInvocation.CONTEXT_MESSAGE_VIEWER_REQUEST or context == IContextMenuInvocation.CONTEXT_MESSAGE_EDITOR_REQUEST or
            context == IContextMenuInvocation.CONTEXT_PROXY_HISTORY or context == IContextMenuInvocation.CONTEXT_TARGET_SITE_MAP_TABLE):

            self._contextMenuData = contextMenuInvocation.getSelectedMessages()
            menuItemList.add(JMenuItem("Send to Phantom RIA Crawler", actionPerformed = self.menuItemClicked))

        return menuItemList


    def menuItemClicked(self, event):
        if (self._running == True):
            self._callbacks.issueAlert("Can't set data to Phantom RIA Crawler: crawling is running already.")
            return;

        dataIsSet = False;
        for message in self._contextMenuData:
            request = self._helpers.analyzeRequest(message)

            url = request.getUrl().toString()
            print url
            if (url):
                dataisSet = True;
                self._addressTextField.setText(url)


class CommandClient():
    def __init__(self, extender):
        self._syncTimer = Timer(1000, None)
        self._syncTimer.setRepeats(True)
        self._syncTimer.actionPerformed = self._sendCommandSync
        self._syncTimer.stop()

        self.commandListenPort = 8089;

        self._startTimer = Timer(1000, None)
        self._startTimer.setInitialDelay(1500)
        self._startTimer.setRepeats(False)
        self._startTimer.actionPerformed = self._sendCommandStart
        self._startTimer.stop()

        self._extender = extender

    def startCrawling(self):
        self._startTimer.start()
    def startSync(self):
        self._syncTimer.start()

    def stopCrawling(self):
        self._sendCommandStop(None)
        self._syncTimer.stop()

    def _sendCommandStart(self, ev):
        self._sendCommand("start")
        self.startSync()

    def _sendCommandStop(self, ev):
        self._sendCommand("stop")

    def _sendCommandSync(self, ev):
        result = self._sendCommand("sync")
        self._extender.syncCrawlingState(result)

    def _sendCommand(self, command):
        url = 'http://127.0.0.1:' + str(self.commandListenPort) + '/?command={0}'.format(command)
        # TODO: iterate through parameters

        response =  urllib2.urlopen(url)
        data = json.load(response)
        return data
