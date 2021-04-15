require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('./mysql')
const {spawn} = require('child_process')
const rimraf = require('rimraf')
const readline = require('readline')


const workDir = path.join(__dirname, 'dump')

function wait2mysql() {
  return new Promise(function(resolve, reject) {
    const closeTimerId = setTimeout(function() {
      clearInterval(timerId)
      reject(new Error('Mysql connection timeout.'))
    }, 5000)

    const timerId = setInterval(function() {
      console.log('waiting for mysql')
      if (mysql.checkConnection()) {
        clearTimeout(closeTimerId)
        clearInterval(timerId)
        resolve()
      }
    }, 100)
  })
}

function execDumpAndPatchIt(command, args, outputFile) {
  console.log(command, args)
  return new Promise(function(resolve, reject) {
    const writeStream = fs.createWriteStream(outputFile, 'utf8')
    const child = spawn(command, args.split(' '))
    
    child.on('close', function(code) {
      writeStream.close()
      rl.close()
      code === 0 || code === 2 ? resolve() : reject(new Error(`child process exited with code ${code}`))
    })

    const rl = readline.createInterface({
      input: child.stdout,
      terminal: false,
    })

    rl.on('line', function(line) {
      const newDefiner = 'DEFINER=`'+process.env.to_mysql_user+'`@`%`'
      let str = `${line}`
        .replace('DEFINER=`root`@`localhost`', newDefiner)
        .replace('DEFINER=`billing`@`%`', newDefiner)
        .replace('DEFINER=`dmichael`@`178.150.125.23`', newDefiner)
        .replace('DEFINER=`root`@`%`', newDefiner)
        .replace('ROW_FORMAT=FIXED', '')
      writeStream.write(`${str}\r\n`)
    })
  })
}

function prepareDir() {
  return new Promise(function(resolve, reject) {
    console.log(`workDir: ${workDir}`)
    rimraf(workDir, function(error) {
      if (error) return reject(error)
      fs.mkdir(workDir, function(error) {
        if (error) return reject(error)
        resolve()
      })
    })
  })
}

async function main() {
  await prepareDir()
  const mysqlDump = process.env.mysqlDump
  const mysqlClient = process.env.mysqlClient

  const connection = `-h ${process.env.from_mysql_host} -u ${process.env.from_mysql_user} -p${process.env.from_mysql_password} ${process.env.from_mysql_db}`
  const readRoutinesDump = `--skip-lock-tables --flush-logs --no-data --routines --triggers --events --force ${connection}`

  let readScript = `#!/bin/bash\n`
  readScript += 'echo "Reading portal2 database."\n'
  readScript += 'rm -rf ./dump\n'
  readScript += 'mkdir dump\n'

  const awsConnection = `-h ${process.env.to_mysql_host} -u ${process.env.to_mysql_user} -p${process.env.to_mysql_password} ${process.env.to_mysql_db}`
  let writeScript = [`#!/bin/bash`, 'echo "Writing portal2 database."']

  await wait2mysql()
  readScript += `echo "routines"\n`
  readScript += `${readRoutinesDump}\n`

  await execDumpAndPatchIt(mysqlDump, readRoutinesDump, path.join(workDir, `routines.sql`))
  writeScript.push(`${mysqlClient} ${awsConnection} < routines.sql`)

  // const rows = await mysql('SHOW TABLES where Tables_in_vivat_portal like ?', ['%%'])
  // for(const row of rows) {
  //   const tableName = row['Tables_in_vivat_portal']
  //   const tableDump = `--flush-logs ${connection} ${tableName}`
  //   console.log(`Reading info for ${tableName}`)
  //   await execDumpAndPatchIt(mysqlDump, tableDump, path.join(workDir, `${tableName}.sql`))
  //   writeScript.push(`${mysqlClient} ${awsConnection} < ${tableName}.sql`)
  // }

  fs.writeFileSync(path.join(workDir, `write2aws.sh`), writeScript.join('\n'))
  fs.chmodSync(path.join(workDir, `write2aws.sh`), 0o100)
  mysql.closeAll()
  console.log('Stop')
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
