const fetch = require("node-fetch");
const exec = require('@actions/exec');

const { TAG, ACTOR, OAUTH_TOKEN, ORG_ID, ISSUE_ID } = process.env;

// const getOptions = (output, error) => {
//     const options = {};
//     options.listeners = {
//         stdout: (data) => {
//             output += data.toString();
//         },
//         stderr: (data) => {
//             error += data.toString();
//         }
//     };
//     return options;
// }

const getSummary = () => {
    const currentTag = TAG.replace('rc-', '');
    const dateNow = new Date().toLocaleDateString();
    return `Релиз №${currentTag} от ${dateNow}`;
}

const getPrevTag = async () => {
    console.log('Получаем предыдущий тег...');
    let arr = TAG.split('.');
    let curPatchVersion = arr[arr.length - 1];
    if (curPatchVersion > 1) {
        var prevTag = `rc-0.0.${curPatchVersion - 1}`
    } else {
        prevTag = null;
    }
    if (prevTag) {
        console.log('Текущий тег является первым');
        return null;
    } else {
        console.log('Сформирован предыдущий тег: ', prevTag);
        return prevTag;
    }

    // let myOutput = '';
    // let myError = '';
    // // const options = getOptions(myOutput, myError);
    // const options = {};
    // options.listeners = {
    //   stdout: (data) => {
    //     myOutput += data.toString();
    //   },
    //   stderr: (data) => {
    //     myError += data.toString();
    //   }
    // };

    // await exec.exec('git describe', ['--tags'], options);

    // let isPrevTagNotFound = myError.startsWith("fatal:");
    // if (isPrevTagNotFound) {
    //     onsole.log('Предыдущий тег не найден');
    //     return null;
    // } else {
    //     console.log('Предыдущий тег: ', myOutput);
    //     return myOutput.trim();
    // }
}

const getCommits = async (prevTag) => {
    console.log('Получаем список коммитов...');

    let myOutput = '';
    let myError = '';
    // const options = getOptions(myOutput, myError);
        
    const options = {};
    options.listeners = {
        stdout: (data) => {
            myOutput += data.toString();
        },
        stderr: (data) => {
            myError += data.toString();
        }
    };

    let tagsOption = prevTag ? `${prevTag}...${TAG}` : TAG;
    console.log('Диапазон тегов для получения списка коммитов:', tagsOption);
    await exec.exec('git log', ['--pretty=format:"%H %an %s"', tagsOption], options);

    let isCommitsNotFound = myError.startsWith("fatal:");
    if (isCommitsNotFound) {
        console.log('Коммиты не найдены');
        return null;
    } else {
        let commits = myOutput.replace(/"/g, '');
        console.log('Список коммитов: ', commits);
        return commits;
    }
}

const getDescription = async () => {
    const taskResponsibleInfo = `ответственный за релиз ${ACTOR}\n`;

    let prevTag = await getPrevTag();
    let commits = await getCommits(prevTag);

    const description = ''.concat(
        taskResponsibleInfo,
        'коммиты, попавшие в релиз:\n',
        commits,
    )

    return description;
}

const update_ticket = async () => {
    const summary = getSummary();
    const description = await getDescription();

    const headers = {
        Authorization: `OAuth ${OAUTH_TOKEN}`,
        "X-Org-ID": ORG_ID,
        "Content-Type": "application/json"
    };

    const data = { summary, description };
    const url = `https://api.tracker.yandex.net/v2/issues/${ISSUE_ID}`;
    
    console.log('Сформированные данные для запроса', data);
    console.log('Отправка запроса на адрес', url);

    const responce = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data),
    });

    if (!responce.ok) {
        throw Error(`Ошибка при обновлении тикета: ${responce.statusText}`);
    } else {
        console.log('Обновление тикета успешно завершено.');
    }
}

update_ticket().then(r => console.log('Задача завершена.'));