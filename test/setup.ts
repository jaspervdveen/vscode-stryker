import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export const mochaHooks = {
  async afterEach(): Promise<void> {
    sinon.restore();
  },
};
