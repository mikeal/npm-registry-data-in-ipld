const bent = require('bent')
const codec = require('@ipld/dag-cbor')
const hasher = require('multiformats/hashes/sha2').sha256
const Block = require('multiformats/block')

const encode = value => Block.encode({ value, hasher, codec })

const registry = bent('https://skimdb.npmjs.com/registry/', 'json')

const db = {}

const store = {}
const get = async cid => store[cid.toString()] || null
const put = async block => store[block.cid.toString()] = block

const download = async (name) => {
  const doc = await registry(name)
  for (const [version, manifest] of Object.entries(doc.versions)) {
    const block = await encode(manifest)
    await put(block)
    doc.versions[version] = block.cid
 }
  const block = await encode(doc)
  await put(block)
  db[name] = block.cid
  return block.cid
}

const latestDeps = async cid => {
  const promises = []
  const { value } = await get(cid)
  for (const name of Object.keys(value.dependencies)) {
    if (!db[name]) promises.push(download(name))
  }
  const all = await Promise.all(promises)
  const blocks = await Promise.all(all.map(cid => get(cid)))
  const cids = []
  for (const { value } of blocks) {
    const version = value['dist-tags'].latest
    cids.push(value.versions[version])
  }
  console.log(cids)
}

const run = async () => {
  await download('request')
  const block = await get(db.request)
  const { value } = block
  const deps = await latestDeps(value.versions['2.73.0'])

}
run()
