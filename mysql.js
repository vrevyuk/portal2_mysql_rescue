/**
 * Created by Vitaly Revyuk on 3/14/18.
 */

const MySQLConnector = require('./mysql.connector.proto');

const {
	query, closeAll, startTransaction, queryTransaction, commitTransaction, rollbackTransaction, pool, escape, format, checkConnection
} = new MySQLConnector({
	connectionLimit: process.env.NODE_ENV === 'production' ? 20 : 5,
    host: process.env.from_mysql_host,
    user: process.env.from_mysql_user,
    password: process.env.from_mysql_password,
    database: process.env.from_mysql_db,
	connectTimeout: 3000,
	initialQuery: `SELECT 1`
});

module.exports = query;
module.exports.closeAll = closeAll;
module.exports.startTransaction = startTransaction;
module.exports.queryTransaction = queryTransaction;
module.exports.commitTransaction = commitTransaction;
module.exports.rollbackTransaction = rollbackTransaction;
module.exports.pool = pool;
module.exports.escape = escape;
module.exports.format = format;
module.exports.checkConnection = checkConnection;
