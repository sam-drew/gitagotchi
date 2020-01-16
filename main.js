// main.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const hogan = require('hogan.js');
const find = require('find');
const watch = require('node-watch');

// Find the home (~) directory.
const homedir = require('os').homedir();

// Init record of tracked repos.
var trackedRepos = [{name: 'Scanning for Git repos...'}, {name: 'This could take a few minutes'}];

var template;
fs.readFile('/Users/sam/projects/sam-drew/gitagotchi/gitagotchi.hogan', 'utf8', (err, data) => {
    template = hogan.compile(data);
});

// Find all git repos below home, and add them to tracked list.
function findGitRepos(callback) {
    find.dir(/(\.git$)/, (homedir + '/projects/balance'), function(dirs) {
        trackedRepos = dirs;
        // Format paths, finding git route.
        trackedRepos.forEach((path, index) => {
            var lastSlashIndex = path.lastIndexOf("/");
            if (lastSlashIndex > path.indexOf("/") + 1) { // if not in http://
                trackedRepos[index] = {name: path.substr(0, lastSlashIndex)}; // cut it off
            }
        })
        callback(trackedRepos);
    });
};

// Find and update the status of a repo.
async function status (workingDir) {
    const git = require('simple-git/promise');

    let statusSummary = null;
    try {
        statusSummary = await git(workingDir).status();
    }
    catch (e) {
        // handle the error
    }

    return statusSummary;
};

// Set the status icons for a repo.
function setStatusIcon(repo, statusUpdate) {
    // Find which item in the array we are settings status icons for.
    const index = trackedRepos.findIndex(repoObj => repoObj.name == repo);
    trackedRepos[index]['status'] = [];
    // Go through different status updates checking if theyve changed.
    if (statusUpdate.not_added.length > 0) {
        if (!trackedRepos[index]['status'].includes("🚫")) {
            trackedRepos[index]['status'].push("🚫");
        }
    };
    if (statusUpdate.conflicted.length > 0) {
        if (!trackedRepos[index]['status'].includes("🔫")) {
            trackedRepos[index]['status'].push("🔫");
        }
    };
    if (statusUpdate.created.length > 0) {
        if (!trackedRepos[index]['status'].includes("⚡️")) {
            trackedRepos[index]['status'].push("⚡️");
        }
    };
    if (statusUpdate.deleted.length > 0) {
        if (!trackedRepos[index]['status'].includes("❌")) {
            trackedRepos[index]['status'].push("❌");
        }
    };
    if (statusUpdate.modified.length > 0) {
        if (!trackedRepos[index]['status'].includes("📝")) {
            trackedRepos[index]['status'].push("📝");
        }
    };
    if (statusUpdate.renamed.length > 0) {
        if (!trackedRepos[index]['status'].includes("✏️")) {
            trackedRepos[index]['status'].push("✏️")
        }
    };
    if ((statusUpdate.not_added.length == 0) &&
        (statusUpdate.conflicted.length == 0) &&
        (statusUpdate.created.length == 0) &&
        (statusUpdate.deleted.length == 0) &&
        (statusUpdate.modified.length == 0) &&
        (statusUpdate.renamed.length == 0)) {
        trackedRepos[index]['status'].push("✅")
    };
};

function createWindow () {
    // Find all git repos below home.
    findGitRepos(repos => {
        // Scan all repos for git status.
        repos.forEach((repo, i) => {
            status(repo.name).then(status => {
                // Update the status icons for each repo.
                setStatusIcon(repo.name, status);
                // Load initial state findings to template and render.
                var page = template.render({repos: trackedRepos, face: "٩(◕‿◕｡)۶"})
                var encodedPage = encodeURI(page);
                // load new html to window...
                win.loadURL(
                    require('url').format({
                        protocol: 'data',
                        pathname: ('text/html,' + encodedPage)
                    })
                )
            });
        });
        // Watch repos.
        watch(repos.map(({ name}) => name), {recursive: true}, function(evt, name) {
            // Each time an event occurs, check for repos that the file is a child of
            // and check their git status.
            repos.forEach((repo, index) => {
                if (name.includes(repo.name) && !name.includes('.git')) {
                    status(repo.name).then(status => {
                        // Upate repoStatus variable.
                        setStatusIcon(repo.name, status);
                        // Regenerate html...
                        console.log(trackedRepos);
                        var page = template.render({repos: trackedRepos, face: "٩(◕‿◕｡)۶"})
                        var encodedPage = encodeURI(page);
                        // load new html to window...
                        win.loadURL(
                            require('url').format({
                                protocol: 'data',
                                pathname: ('text/html,' + encodedPage)
                            })
                        )
                    });
                };
            });
        });
    });

    // Create the browser window.
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // Load webpage to window.
    fs.readFile('gitagotchi.hogan', 'utf8', (err, data) => {
        template = hogan.compile(data);
        var page = template.render({repos: trackedRepos, face: "٩(◕‿◕｡)۶"})
        var encodedPage = encodeURI(page);
        // load new html to window...
        win.loadURL(
            require('url').format({
                protocol: 'data',
                pathname: ('text/html,' + encodedPage)
            })
        )
    });

};

app.on('ready', createWindow)
