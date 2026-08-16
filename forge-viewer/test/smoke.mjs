import assert from "node:assert/strict";
import { normalizeDeviceId, validateAssignment } from "../src/index.js";

assert.equal(normalizeDeviceId("FORGE-01"), "forge-01");
assert.equal(normalizeDeviceId("bad id"), null);
assert.equal(validateAssignment({ url: "https://example.com", label: "TEST" }).ok, true);
assert.equal(validateAssignment({ url: "javascript:alert(1)" }).ok, false);
assert.equal(validateAssignment({ url: "http://example.com" }).ok, false);
assert.equal(validateAssignment({ url: "https://user:pass@example.com" }).ok, false);
console.log("smoke: ok");
