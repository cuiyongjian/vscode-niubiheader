// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "niubiheader" is now active!');

    var niubiConfig = getCurrentNiubiConfig()
    console.log('niubiconfig', niubiConfig)

    vscode.workspace.onDidChangeConfiguration(function (config) {
        console.log('config changed', config)
        niubiConfig = getCurrentNiubiConfig()
    })
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.niubiheader', function () {
        // The code you place here will be executed every time your command is executed
        var editor = vscode.editor || vscode.window.activeTextEditor;
                                    
        /*
        * @Author: huangyuan
        * @Date: 2017-02-28 17:51:35
        * @Last Modified by:   huangyuan413026@163.com
        * @Last Modified time: 2017-02-28 17:51:35
        * @description: 在当前行插入,而非在首行插入
        */
                
        var line = editor.selection.active.line;
        editor.edit(function (editBuilder) {
            // 当前日期格式化
            var time = new Date().format(niubiConfig.dateFormat || "yyyy-MM-dd hh:mm");
            var data = Object.assign({
                createTime: time,
                updateTime: time
            }, niubiConfig.data)
            try {
                var tpl = new template(niubiConfig.tpl).render(data);;
                editBuilder.insert(new vscode.Position(line, 0), tpl);
            } catch (error) {
                console.error(error);
            }
        });
    });

    context.subscriptions.push(disposable);

    vscode.workspace.onDidSaveTextDocument(function (file) {
        setTimeout(function () {
            try {
                var f = file;
                var editor = vscode.editor || vscode.window.activeTextEditor;
                var document = editor.document;
                var authorRange = null;
                var authorText = null;
                var lastTimeRange = null;
                var lastTimeText = null;
                var diff = -1;
                var lineCount = document.lineCount;
                var comment = false;
                for (var i = 0; i < lineCount; i++) {
                    var linetAt = document.lineAt(i);
                    
                    var line = linetAt.text;
                    line = line.trim();
                    if (line.startsWith("/*") && !line.endsWith("*/")) {//是否以 /* 开头
                        console.log('在这里')
                        comment = true;//表示开始进入注释
                    } else if (comment) {
                        console.log('还可以这里？')
                        if (line.endsWith("*/")) {
                            comment = false;//结束注释
                        }
                        var range = linetAt.range;
                        console.log('range', range)
                        if (line.indexOf('@author') > -1) {//表示是有修改人
                            authorRange = range;
                            authorText=' * @author: ' + niubiConfig.data.author;
                        } else if (line.indexOf('@date') > -1) {//最后修改时间
                            var time = line.replace('@date:', '').replace('*', '');
                            var oldTime = new Date(time);
                            var curTime = new Date();
                            var diff = (curTime - oldTime) / 1000;
                            console.log('最后修改时间的diff', diff)
                            lastTimeRange = range;
                            console.log('timerange', lastTimeRange)
                            lastTimeText=' * @date: ' + curTime.format(niubiConfig.dateFormat || "yyyy-MM-dd hh:mm:ss");
                        }
                        if (!comment) {
                            break;//结束
                        }
                    }
                }
                if ((authorRange != null) && (lastTimeRange != null) && (diff > 20)) {
                    setTimeout(function () {
                        editor.edit(function (edit) {
                            edit.replace(authorRange, authorText);
                            edit.replace(lastTimeRange, lastTimeText);
                        });
                        document.save();
                    }, 200);
                }

            } catch (error) {
                console.log('这里错了')
                console.error(error);
            }
        }, 200);
    });

}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;



// 辅助类型和函数

// 日期
Date.prototype.format = function (format) {
    var o = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(), //day
        "h+": this.getHours(), //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
        "S": this.getMilliseconds() //millisecond
    }
    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}

function getCurrentNiubiConfig() {
    return getConfiguration('niubiheader')
}
// 获取vscode配置
function getConfiguration(name) {
    return vscode.workspace.getConfiguration(name);
}

// 获取行文本
function getLineText(lineNum, editor) {
    const document = editor.document;
    if (lineNum >= document.lineCount) {
        return '';
    }
    const start = new vscode.Position(lineNum, 0);
    const lastLine = document.lineAt(lineNum);
    const end = new vscode.Position(lineNum, lastLine.text.length);
    const range = new vscode.Range(start, end);
    var t = document.getText(range);
    return t;
}

// 覆盖行文本
function replaceLineText(lineNum, text, editor) {
    const document = editor.document;
    if (lineNum >= document.lineCount) {
        return '';
    }
    const start = new vscode.Position(lineNum, 0);
    const lastLine = document.lineAt(lineNum);
    const end = new vscode.Position(lineNum, lastLine.text.length);
    const range = new vscode.Range(start, end);
    editor.edit(function (edit) {
        edit.replace(range, text);
    });

}

// 模板引擎
function template(tpl) {
    var
        fn,
        match,
        code = ['var r=[];\nvar _html = function (str) { return str.replace(/&/g, \'&amp;\').replace(/"/g, \'&quot;\').replace(/\'/g, \'&#39;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\'); };'],
        re = /\{\s*([a-zA-Z\.\_0-9()]+)(\s*\|\s*safe)?\s*\}/m,
        addLine = function (text) {
            code.push('r.push(\'' + text.replace(/\'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '\');');
        };
    while (match = re.exec(tpl)) {
        if (match.index > 0) {
            addLine(tpl.slice(0, match.index));
        }
        if (match[2]) {
            code.push('r.push(String(this.' + match[1] + '));');
        }
        else {
            code.push('r.push(_html(String(this.' + match[1] + ')));');
        }
        tpl = tpl.substring(match.index + match[0].length);
    }
    addLine(tpl);
    code.push('return r.join(\'\');');
    fn = new Function(code.join('\n'));
    this.render = function (model) {
        return fn.apply(model);
    };
}