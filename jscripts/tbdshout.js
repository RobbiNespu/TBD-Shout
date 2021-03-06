/*!
* tbdshout.js - TBD Shout
* Copyright (C) 2015 Suhaimi Amir <suhaimi@tbd.my>
* Licensed under GNU General Public License v3
*/

var tbdshoutApp = angular.module('tbdshoutApp', ['ngWebSocket','yaru22.angular-timeago']);

tbdshoutApp.directive('a', function() {
  return {
    restrict: 'E',
    link: function(scope, elem, attrs) {
      if(attrs.ngClick || attrs.href === '' || attrs.href === '#'){
        elem.on('click', function(e){
          e.preventDefault();
        });
      }
    }
  };
});

tbdshoutApp.controller('shoutCtrl', ['$scope', '$sce', '$http','$websocket','$window', function ($scope,$sce,$http,$websocket, $window){

  var smiley_data = {}, bunyi = true, lastMsgReq = 0, nampak = true, msgcol = [],udata,status_arr = {1:'',2:'Connecting...',0:'Disconnected',3:'Reconnecting...'};
  var max_msg_row = 30;
  var reconnect_time = 2000;
  $scope.shoutText = '';
  $scope.bunyi_txt = 'Sound: ON';

  var pendingMsg = {};

  $window.onblur = function() {
    nampak = false;
  };

  $window.onfocus = function() {
    nampak = true;
  };

  angular.element($('#tbdshoutRowBox')).bind("scroll", function (event) {
    var x = event.currentTarget;
    var last_msg = msgcol[msgcol.length - 1];

    if(x.offsetHeight + x.scrollTop >= x.scrollHeight - 100) {
      getMsg(function() {},last_msg.id);
    }
  });

  var playNotify = function() {
    if (nampak === false && bunyi === true) {
      document.getElementById('tbdshout_notify').play();
    }
  };

  var statusChange = function(status) {
    $scope.status = status;
    $scope.status_txt = status_arr[status];
  };

  var linky = function(text) {
    var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
    return text.replace(urlPattern, '<a target="_blank" href="$&">$&</a>');
  };

  /*var getMsgById = function(msgid) {
    for (var i=0; i < msgcol.length; i++) {
        if (msgcol[i].msgid === msgid) {
            return msgcol[i];
        } else {
          return null;
        }
    }
  };*/

  var reconnect = function() {

    setTimeout(function(){
      console.log('Connection lost, reconnect in ' + parseInt(reconnect_time/1000) + 'sec');
      reconnect_time = reconnect_time*2;
      statusChange(3);
      console.log('Reconnecting...');
      ws.reconnect();
    }, reconnect_time);
  };

  var randomStr = function (){
    var s = "", x = 16;
    while(s.length<x&&x>0){
        var r = Math.random();
        s+= (r<0.1?Math.floor(r*100):String.fromCharCode(Math.floor(r*26) + (r>0.5?97:65)));
    }
    return s;
}

  var getMsg = function(callback, lastmsg) {
    var getLastMsg = '';
    if (lastmsg > 0) {
      if (lastMsgReq == lastmsg) { return false; }
      getLastMsg = '&lastMsg=' + lastmsg;
      lastMsgReq = lastmsg;
    }

    $http.get('xmlhttp.php?action=tbdshout_get' + getLastMsg).success(function(data) {

      if (data.msg) {
        for (var i in data.msg) {
          data.msg[i].msg = data.msg[i].msg;
          msgcol.push(data.msg[i]);
        }
      }

      callback(data);
    });
  };

  var start = function(callback) {
    statusChange(0);

    getMsg(function(data) {
      $scope.sr_tinggi_kotak = { 'height': data.max_height + 'px'};
      udata = data;
      max_msg_row = data.max_msg;
      $scope.isadmin = udata.isadmin;

      if (data.channel !== '' && data.skey !== '') {
        callback();
      }
    });

  };

  start(function() {
    statusChange(2);
    ws = $websocket('wss://chat.tbd.my/con/' + udata.skey + '/' + udata.channel);

    ws.onMessage(function(data) {

      data = angular.fromJson(data.data);

      if (data.name === '') { return; }
      if (data.uid < 1) { return; }

      if (angular.equals(data.channel,udata.channel)) {
        playNotify();

        msgcol.unshift({
          id: data.id,
          msgid: data.msgid,
          name:data.name,
          avatar: data.avatar,
          msg: data.msg,
          date: (new Date()).getTime(),
        });

        if (msgcol.length >= max_msg_row) {
          msgcol.pop();
        }
      }
    });

    ws.onClose(function(data) {
      statusChange(0);
      reconnect();
    });

    ws.onOpen(function(data) {
      statusChange(1);
      reconnect_time = 2000;
      //console.log('connected!');
    });
  });

  $scope.msgRows = msgcol;

  $scope.tawakalJela = function(data) {
    return $sce.trustAsHtml(data);
  };

  $scope.sendMsg = function() {
    ws.send(JSON.stringify({msgid:randomStr(),name:udata.name,uid:udata.uid,msg:$scope.shoutText,key:udata.ukey,channel:udata.channel,avatar:udata.avatar}));
    $scope.shoutText = '';
  };

  $scope.appendMsg = function(text) {
    $scope.shoutText += ' ' + text;
  };

  $scope.delMsg = function(row) {
    if (confirm("Are you sure you want to delete?") === true) {
      var index = msgcol.indexOf(row);

      $http.post('xmlhttp.php?action=tbdshout_delete&post_code=' + my_post_key, { id: row.id })
      .success(function(data) {
        msgcol.splice(index, 1);
      });
    }
  };

  $scope.toggleSound = function() {
    if (bunyi === true) {
      bunyi = false;
      $scope.bunyi_txt = 'Sound: OFF';
    } else {
      bunyi = true;
      $scope.bunyi_txt = 'Sound: ON';
    }
  };

}]);

var tbdshout_addSmiley = function(smiley) {
  angular.element($('#shoutCtrl')).scope().appendMsg(smiley);
};
